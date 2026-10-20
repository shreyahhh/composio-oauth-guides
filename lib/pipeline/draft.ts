import { generateObject } from "ai";
import { flashModel } from "@/lib/ai/model";
import { withBackoff } from "@/lib/ai/retry";
import { DraftedGuideSchema, type DraftedGuide, type ManagedAuthStatus } from "@/lib/schema/guide";
import type { ResolvedApp, ResearchResult } from "./types";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Converts the Research step's free-text narrative + source list into the
 * guide schema. This call doesn't search or look anything up on its own --
 * it only reorganizes claims the Research step already made, against the
 * source list Research already collected via Tavily/Readability.
 */
export async function draftGuide(
  resolved: ResolvedApp,
  research: ResearchResult,
  managedAuth: ManagedAuthStatus
): Promise<DraftedGuide> {
  const sourceList = research.sources
    .map((s, i) => `[${i + 1}] ${s.url}${s.title ? ` -- ${s.title}` : ""}`)
    .join("\n");

  const { object } = await withBackoff(() =>
    generateObject({
      model: flashModel,
      schema: DraftedGuideSchema,
      providerOptions: { groq: { structuredOutputs: true } },
      prompt: `Fill out an OAuth setup guide for "${resolved.appName}" using ONLY the research notes and source list below -- do not invent facts beyond what's stated here.

RESEARCH NOTES:
"""
${research.narrative}
"""

SOURCES (cite these exact URLs in sourceUrl fields; match claims to the source that actually supports them):
${sourceList || "(none found)"}

COMPOSIO MANAGED AUTH STATUS (already checked via the Composio SDK -- use as-is, do not re-derive):
${JSON.stringify(managedAuth)}

Rules for every claim (prerequisites, step evidence, scope notes, blocker evidence):
- evidence: "DOCUMENTED" only if a source URL above clearly supports it (cite it in sourceUrl).
- evidence: "REPORTED" if it came from a community/secondary source in the notes, not an official doc.
- evidence: "UNCERTAIN" if the research notes themselves expressed doubt or you cannot find support -- and in that case, omit sourceUrl.
- Never use "TESTED" -- this pipeline doesn't perform hands-on testing, only research.
- Every evidence object needs lastChecked set to "${today()}".

appUrl: ${resolved.appUrl ?? "omit if unknown"}
providerDocsUrl: ${resolved.providerDocsUrl ?? "omit if unknown"}
developerPortalUrl: ${resolved.developerPortalUrl ?? "omit if unknown"}
appName: ${resolved.appName}

For the verdict, lead the summary with the practical answer: how long until a working test connection, and how long until production approval including any review wait.`,
    })
  );

  return object;
}
