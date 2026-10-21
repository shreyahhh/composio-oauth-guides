import { generateObject } from "ai";
import { z } from "zod";
import { flashModel } from "@/lib/ai/model";
import { withBackoff } from "@/lib/ai/retry";
import { tavilySearch } from "@/lib/search/tavily";
import { EvidenceLabel, type SourcedClaim, type DraftedGuide } from "@/lib/schema/guide";
import type { ResearchSource } from "./types";

const CriticResultSchema = z.object({
  downgrades: z.array(
    z.object({
      claimText: z.string().describe("Must match a claim's text field verbatim."),
      newLabel: EvidenceLabel,
      reason: z.string(),
    })
  ),
});

function collectClaims(guide: DraftedGuide): SourcedClaim[] {
  return [
    ...guide.prerequisites,
    ...guide.steps.map((s) => s.evidence).filter((e): e is SourcedClaim => !!e),
    ...guide.scopesAndTiers.map((s) => s.notes),
    ...guide.blockers.map((b) => b.evidence),
  ];
}

type Downgrade = { claimText: string; newLabel: string; reason: string; sourceUrl?: string };

export type CriticOutcome = { guide: DraftedGuide; downgrades: Downgrade[] };

// Caps on the extra verification work so a guide with many weak claims can't
// blow the Tavily free-tier budget or the Vercel 300s function ceiling: at
// most this many claims get the retry treatment, each getting at most this
// many search attempts before we accept UNCERTAIN.
const MAX_CLAIMS_TO_RECOVER = 3;
const MAX_ATTEMPTS_PER_CLAIM = 3;

function isLikelyOfficialDocs(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return /(^|\.)docs\.|developer\.|developers\./.test(host);
  } catch {
    return false;
  }
}

// A domain pattern alone isn't enough -- evidence-findings.ts caught this
// exact gap recovering a claim about GitHub's token exchange with a
// Norwegian BankID blog post, because the recovery search just grabbed the
// first unused result regardless of what it was actually about. Requiring
// the app's own name to appear in the result's title/snippet is a cheap but
// effective check specifically for "wrong provider" sources -- OAuth
// explainer pages share generic vocabulary (token, scope, authorization)
// across completely unrelated providers, so a keyword-overlap check on the
// claim text alone wouldn't have caught this; checking for the app name
// does, because an off-topic page essentially never happens to mention it.
function mentionsApp(result: { title: string; content: string }, appName: string): boolean {
  const haystack = `${result.title} ${result.content}`.toLowerCase();
  return haystack.includes(appName.toLowerCase());
}

function retryQuery(appName: string, claimText: string, attempt: number): string {
  if (attempt === 0) return `${appName} ${claimText}`;
  if (attempt === 1) return `${appName} official documentation ${claimText}`;
  return `"${appName}" developer docs ${claimText}`;
}

/**
 * Before accepting a claim as UNCERTAIN, try a couple more targeted
 * searches -- the model's own source list might just be incomplete for
 * this specific claim, not the claim itself being genuinely unverifiable.
 * Only called for claims the critic flagged UNCERTAIN, capped to keep
 * search-API usage and runtime bounded. A candidate result is only accepted
 * if it actually mentions the app being documented -- otherwise it's
 * skipped and the next search attempt (or eventually UNCERTAIN) is used
 * instead of attaching an off-topic source just because it was the first
 * unused result.
 */
async function tryRecoverUncertainClaims(
  downgrades: Downgrade[],
  appName: string,
  alreadyTriedUrls: string[]
): Promise<Downgrade[]> {
  const toUpgrade = downgrades.filter((d) => d.newLabel === "UNCERTAIN").slice(0, MAX_CLAIMS_TO_RECOVER);
  const recoveredByClaimText = new Map<string, Downgrade>();

  for (const d of toUpgrade) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_CLAIM; attempt++) {
      const results = await tavilySearch(retryQuery(appName, d.claimText, attempt), 3);
      const match = results.find((r) => !alreadyTriedUrls.includes(r.url) && mentionsApp(r, appName));
      if (match) {
        recoveredByClaimText.set(d.claimText, {
          claimText: d.claimText,
          newLabel: isLikelyOfficialDocs(match.url) ? "DOCUMENTED" : "REPORTED",
          reason: `Recovered via an additional search after the first pass found no source.`,
          sourceUrl: match.url,
        });
        break;
      }
    }
  }

  return downgrades.map((d) => recoveredByClaimText.get(d.claimText) ?? d);
}

/**
 * Second LLM pass: checks every claim actually has a supporting source,
 * downgrading anything unsupported to UNCERTAIN -- but before finalizing an
 * UNCERTAIN downgrade, makes a bounded effort to find a real source via
 * fresh, targeted web searches rather than giving up on the first miss.
 * This is the guardrail against a confident-but-fabricated guide AND
 * against a guide that's needlessly vague when a source was findable.
 */
export async function critiqueGuide(guide: DraftedGuide, sources: ResearchSource[], appName: string): Promise<CriticOutcome> {
  const claims = collectClaims(guide);
  const sourceUrls = sources.map((s) => s.url);

  const { object } = await withBackoff(() =>
    generateObject({
      model: flashModel,
      schema: CriticResultSchema,
      // Each source includes a content snippet, not just a bare URL -- a
      // URL string alone gives no way to judge whether it actually supports
      // a specific claim (evidence-findings.ts found claims citing a page
      // that was real and in-scope but didn't substantiate that particular
      // claim). Judging against actual text is still imperfect -- OAuth
      // explainer pages share generic vocabulary across unrelated providers
      // -- but it's strictly more grounded than judging a bare URL string.
      prompt: `You are auditing an OAuth setup guide for fabricated or unsupported claims before it's published.

VALID SOURCES (a claim's sourceUrl must match one of these URLs; use the snippet to judge whether it actually supports the specific claim text, not just whether the URL exists):
${sources.map((s) => `- ${s.url}${s.title ? ` (${s.title})` : ""}${s.content ? `\n  snippet: "${s.content}"` : ""}`).join("\n") || "(none)"}

CLAIMS TO AUDIT (each has text, evidence label, and optional sourceUrl):
${JSON.stringify(claims, null, 2)}

For each claim, decide if its evidence label is justified:
- A "DOCUMENTED" or "REPORTED" claim needs a sourceUrl that is in the valid list above AND whose snippet topically supports the specific claim text -- not just a source that exists and is broadly about ${appName}'s OAuth setup. A source whose snippet doesn't mention anything related to the specific claim (e.g. a general landing page cited for a narrow technical detail it doesn't actually cover) should be downgraded even though the URL itself is valid.
- A claim with no sourceUrl, or a sourceUrl not in the valid list, cannot be DOCUMENTED or REPORTED -- it must be downgraded to UNCERTAIN.
- Flag any claim that looks fabricated, overly specific without support (e.g. a suspiciously precise time estimate with no source), or that contradicts another claim in the list.

Return ONLY the claims that need to change, as downgrades with the exact original claimText, the corrected newLabel, and a short reason. If every claim is already justified, return an empty array.

Respond with a single JSON object matching the required schema -- no other text.`,
    })
  );

  const finalDowngrades = await tryRecoverUncertainClaims(object.downgrades, appName, sourceUrls);

  const downgradeMap = new Map(finalDowngrades.map((d) => [d.claimText, d]));

  function applyTo(claim: SourcedClaim): SourcedClaim {
    const d = downgradeMap.get(claim.text);
    if (!d) return claim;
    const next: SourcedClaim = { ...claim, evidence: d.newLabel as SourcedClaim["evidence"] };
    next.sourceUrl = d.newLabel === "UNCERTAIN" ? null : (d.sourceUrl ?? claim.sourceUrl);
    return next;
  }

  const patched: DraftedGuide = {
    ...guide,
    prerequisites: guide.prerequisites.map(applyTo),
    steps: guide.steps.map((s) => (s.evidence ? { ...s, evidence: applyTo(s.evidence) } : s)),
    scopesAndTiers: guide.scopesAndTiers.map((s) => ({ ...s, notes: applyTo(s.notes) })),
    blockers: guide.blockers.map((b) => ({ ...b, evidence: applyTo(b.evidence) })),
  };

  return { guide: patched, downgrades: finalDowngrades };
}
