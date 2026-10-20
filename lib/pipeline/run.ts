import { db } from "@/lib/db/client";
import { guides } from "@/lib/db/schema";
import { computeEvidenceSummary, GuideSchema, slugify, type Guide } from "@/lib/schema/guide";
import { checkManagedAuth } from "@/lib/composio";
import { MODEL_VERSION } from "@/lib/ai/model";
import { resolveApp } from "./resolve";
import { researchApp } from "./research";
import { draftGuide } from "./draft";
import { critiqueGuide } from "./critic";
import type { PipelineEvent } from "./types";

export type RunOptions = {
  input: string;
  /** Overrides the computed slug -- used by the Evidence page to write to "<slug>-generated". */
  slugOverride?: string;
  onEvent: (event: PipelineEvent) => void;
};

/**
 * Runs the full 6-step live-generation pipeline, emitting a progress event
 * per step so the caller can stream it to the client. Each step is allowed
 * to fail independently -- if Research or Draft comes back thin, we still
 * save an honest partial guide rather than aborting, per the brief's "an
 * honest partial guide, not a confident fake."
 */
export async function runPipeline({ input, slugOverride, onEvent }: RunOptions): Promise<string> {
  onEvent({ type: "step_start", step: "resolve", label: "Figuring out which provider this is..." });
  const resolved = await resolveApp(input);
  onEvent({
    type: "step_done",
    step: "resolve",
    label: `Resolved to ${resolved.appName}`,
    detail: resolved.providerDocsUrl ? `Docs: ${resolved.providerDocsUrl}` : "Could not confirm an official docs URL.",
  });

  onEvent({ type: "step_start", step: "research", label: `Researching ${resolved.appName}'s OAuth setup...` });
  const research = await researchApp(resolved);
  if (research.sources.length === 0) {
    onEvent({
      type: "step_warning",
      step: "research",
      label: "Research finished with few sources",
      detail: "Couldn't find strong sources -- the guide below will lean heavily on UNCERTAIN labels.",
    });
  } else {
    onEvent({
      type: "step_done",
      step: "research",
      label: `Found ${research.sources.length} source(s)`,
    });
  }

  onEvent({ type: "step_start", step: "composio_check", label: "Checking Composio managed auth..." });
  const slug = slugOverride ?? slugify(resolved.appName);
  const managedAuth = await checkManagedAuth(slug);
  onEvent({
    type: "step_done",
    step: "composio_check",
    label: managedAuth.available
      ? `Composio managed auth available (${managedAuth.authScheme})`
      : "No Composio managed auth found -- bring your own OAuth app",
  });

  onEvent({ type: "step_start", step: "draft", label: "Drafting the guide..." });
  const drafted = await draftGuide(resolved, research, managedAuth);
  onEvent({ type: "step_done", step: "draft", label: "Draft complete" });

  onEvent({ type: "step_start", step: "critic", label: "Checking every claim has a source..." });
  const sourceUrls = research.sources.map((s) => s.url);
  const { guide: critiqued, downgrades } = await critiqueGuide(drafted, sourceUrls);
  onEvent({
    type: "step_done",
    step: "critic",
    label:
      downgrades.length > 0
        ? `Downgraded ${downgrades.length} unsupported claim(s) to UNCERTAIN`
        : "Every claim checks out",
  });

  onEvent({ type: "step_start", step: "save", label: "Saving guide..." });
  const guideWithoutSummary = {
    ...critiqued,
    slug,
    source: "generated" as const,
    generatedAt: new Date().toISOString(),
    pipelineVersion: MODEL_VERSION,
  };
  const guide: Guide = {
    ...guideWithoutSummary,
    evidenceSummary: computeEvidenceSummary(guideWithoutSummary),
  };
  const validated = GuideSchema.parse(guide);

  await db
    .insert(guides)
    .values({
      slug,
      appName: validated.appName,
      appUrl: validated.appUrl,
      source: "generated",
      guideJson: validated,
      modelVersion: MODEL_VERSION,
    })
    .onConflictDoUpdate({
      target: guides.slug,
      set: {
        appName: validated.appName,
        appUrl: validated.appUrl,
        guideJson: validated,
        modelVersion: MODEL_VERSION,
        updatedAt: new Date(),
      },
    });

  onEvent({ type: "step_done", step: "save", label: "Saved" });
  onEvent({ type: "done", slug });
  return slug;
}
