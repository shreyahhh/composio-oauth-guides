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
      maxRetries: 0,
      schema: DraftedGuideSchema,
      // Groq's strict structured-output mode (the reliable path) requires
      // every property to be listed in the JSON schema's `required` array --
      // which is why GuideSchema uses z.nullable() instead of z.optional()
      // throughout (see lib/schema/guide.ts). With that in place, this can
      // stay enabled.
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
- evidence: "UNCERTAIN" if the research notes themselves expressed doubt or you cannot find support -- and in that case, set sourceUrl to null.
- Never use "TESTED" -- this pipeline doesn't perform hands-on testing, only research.
- Every evidence object needs lastChecked set to "${today()}".
- Every field in the schema is required -- use null (not omission) for anything unknown: estimatedMinutes, a step's evidence, a blocker's workaround, sourceUrl, appUrl, providerDocsUrl, developerPortalUrl.

appUrl: ${resolved.appUrl ?? "null (unknown)"}
providerDocsUrl: ${resolved.providerDocsUrl ?? "null (unknown)"}
developerPortalUrl: ${resolved.developerPortalUrl ?? "null (unknown)"}
appName: ${resolved.appName}

For the verdict, lead the summary with the practical answer: how long until a working test connection, and how long until production approval including any review wait.

Respond with a single JSON object matching the required schema -- no other text.`,
    })
  );

  return object;
}
