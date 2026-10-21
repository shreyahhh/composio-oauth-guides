import { generateObject } from "ai";
import { flashModel } from "@/lib/ai/model";
import { withBackoff } from "@/lib/ai/retry";
import { DraftedGuideSchema, type DifficultyTier, type DraftedGuide, type ManagedAuthStatus } from "@/lib/schema/guide";
import type { ResolvedApp, ResearchResult } from "./types";

const today = () => new Date().toISOString().slice(0, 10);

const TIER_ORDER: DifficultyTier[] = ["self_serve", "light_review", "heavy_review", "gated_partner"];

// Deliberately broad/simple regexes over precise ones: a false-positive bump
// (tier called harder than it needs to be) is a much cheaper mistake than a
// false negative (tier called easier than a hard cap/review it just
// described), given which direction evidence-findings.ts found the Draft
// step actually erring in (Google: labeled self_serve, generated its own
// "Await Google review" multi-week step).
const GATED_SIGNALS = /\b(partner program|invite[- ]only|waitlist|apply to become a partner|request(ing)? access)\b/i;
const HEAVY_SIGNALS =
  /\b(weeks?|security assessment|CASA|quota|organizations? only|not individuals|eligib(le|ility)|caps?\b|renewed annually|annual(ly)? renew)/i;
// Specific multi-word phrases, not a bare "review" -- a bare "review" false-
// positives constantly (most guides mention logging in to "review" your app
// settings, or explicitly say "no review required", which must NOT bump the
// tier). These catch the Notion-shaped gap evidence-findings.ts found: OAuth
// itself works immediately, but a separate, optional public gallery/
// marketplace listing has its own days-long review queue -- that queue alone
// makes it at least light_review, not self_serve.
const LIGHT_SIGNALS =
  /\b(submit(ted|ting)? for review|review queue|integration gallery|app gallery|public gallery|app marketplace|marketplace listing|directory listing|pending review|approval queue)\b/i;

function minimumTierFromText(text: string): DifficultyTier {
  if (GATED_SIGNALS.test(text)) return "gated_partner";
  if (HEAVY_SIGNALS.test(text)) return "heavy_review";
  if (LIGHT_SIGNALS.test(text)) return "light_review";
  return "self_serve";
}

/**
 * The Draft LLM call generates difficultyTier and the steps/prerequisites/
 * blockers/scopes list in the same pass with no cross-check between them --
 * evidence-findings.ts's self-check caught the live pipeline labeling
 * Google's guide self_serve while its own generated steps described a
 * multi-week review, and Notion's self_serve despite describing an
 * Integration Gallery review queue. This scans the guide's own generated
 * text for gate/cap/eligibility/review-queue signals and bumps the tier UP
 * (never down) when it contradicts what the guide itself already says -- the
 * LLM's judgment is only corrected toward a harder answer, never
 * second-guessed toward an easier one.
 */
function enforceTierConsistency(guide: DraftedGuide): DraftedGuide {
  const textToScan = [
    guide.verdict.summary,
    guide.verdict.timeToProductionApproval,
    ...guide.steps.flatMap((s) => [s.title, s.description]),
    ...guide.blockers.flatMap((b) => [b.reason, b.workaround ?? ""]),
    ...guide.prerequisites.map((p) => p.text),
    ...guide.scopesAndTiers.map((s) => s.notes.text),
  ].join(" \n ");

  const minimumTier = minimumTierFromText(textToScan);
  const currentIndex = TIER_ORDER.indexOf(guide.verdict.difficultyTier);
  const minimumIndex = TIER_ORDER.indexOf(minimumTier);
  if (minimumIndex <= currentIndex) return guide;

  return { ...guide, verdict: { ...guide.verdict, difficultyTier: minimumTier } };
}

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
      // Groq's default completion-token ceiling is lower than a fully
      // populated guide needs -- a thorough research pass (more
      // prerequisites/steps/scopes to report, e.g. after the gate/eligibility
      // search added in research.ts) can get the response truncated mid-JSON
      // before reaching required fields like blockers/managedAuth at the end
      // of the schema. Set explicitly rather than relying on the provider
      // default.
      maxOutputTokens: 6000,
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

  return enforceTierConsistency(object);
}
