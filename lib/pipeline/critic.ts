import { generateObject } from "ai";
import { z } from "zod";
import { flashModel } from "@/lib/ai/model";
import { withBackoff } from "@/lib/ai/retry";
import { EvidenceLabel, type SourcedClaim, type DraftedGuide } from "@/lib/schema/guide";

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

export type CriticOutcome = { guide: DraftedGuide; downgrades: Array<{ claimText: string; newLabel: string; reason: string }> };

/**
 * Second LLM pass: checks every claim actually has a supporting source,
 * downgrading anything unsupported to UNCERTAIN before save. This is the
 * guardrail against a confident-but-fabricated guide -- no claim survives
 * into the saved guide without either a real source or an honest UNCERTAIN
 * label.
 */
export async function critiqueGuide(guide: DraftedGuide, sourceUrls: string[]): Promise<CriticOutcome> {
  const claims = collectClaims(guide);

  const { object } = await withBackoff(() =>
    generateObject({
      model: flashModel,
      maxRetries: 0,
      schema: CriticResultSchema,
      prompt: `You are auditing an OAuth setup guide for fabricated or unsupported claims before it's published.

VALID SOURCE URLS (a claim's sourceUrl must be one of these, or very close to one of these, to count as supported):
${sourceUrls.map((u) => `- ${u}`).join("\n") || "(none)"}

CLAIMS TO AUDIT (each has text, evidence label, and optional sourceUrl):
${JSON.stringify(claims, null, 2)}

For each claim, decide if its evidence label is justified:
- A "DOCUMENTED" or "REPORTED" claim needs a sourceUrl that is actually in the valid list above and plausibly supports the claim text.
- A claim with no sourceUrl, or a sourceUrl not in the valid list, cannot be DOCUMENTED or REPORTED -- it must be downgraded to UNCERTAIN.
- Flag any claim that looks fabricated, overly specific without support (e.g. a suspiciously precise time estimate with no source), or that contradicts another claim in the list.

Return ONLY the claims that need to change, as downgrades with the exact original claimText, the corrected newLabel, and a short reason. If every claim is already justified, return an empty array.

Respond with a single JSON object matching the required schema -- no other text.`,
    })
  );

  const downgradeMap = new Map(object.downgrades.map((d) => [d.claimText, d]));

  function applyTo(claim: SourcedClaim): SourcedClaim {
    const d = downgradeMap.get(claim.text);
    if (!d) return claim;
    const next: SourcedClaim = { ...claim, evidence: d.newLabel };
    if (d.newLabel === "UNCERTAIN") next.sourceUrl = null;
    return next;
  }

  const patched: DraftedGuide = {
    ...guide,
    prerequisites: guide.prerequisites.map(applyTo),
    steps: guide.steps.map((s) => (s.evidence ? { ...s, evidence: applyTo(s.evidence) } : s)),
    scopesAndTiers: guide.scopesAndTiers.map((s) => ({ ...s, notes: applyTo(s.notes) })),
    blockers: guide.blockers.map((b) => ({ ...b, evidence: applyTo(b.evidence) })),
  };

  return { guide: patched, downgrades: object.downgrades };
}
