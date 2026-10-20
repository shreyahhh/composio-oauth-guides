import { z } from "zod";

export const EvidenceLabel = z.enum([
  "TESTED",
  "DOCUMENTED",
  "REPORTED",
  "UNCERTAIN",
]);
export type EvidenceLabel = z.infer<typeof EvidenceLabel>;

export const SourcedClaim = z.object({
  text: z.string(),
  evidence: EvidenceLabel,
  // absent only when evidence === "UNCERTAIN" and no source could be found
  sourceUrl: z.string().url().optional(),
  lastChecked: z.string(), // ISO date, e.g. "2026-10-21"
});
export type SourcedClaim = z.infer<typeof SourcedClaim>;

export const DifficultyTier = z.enum([
  "self_serve",
  "light_review",
  "heavy_review",
  "gated_partner",
]);
export type DifficultyTier = z.infer<typeof DifficultyTier>;

export const StepOwner = z.enum([
  "agent_can_do",
  "agent_can_assist",
  "you_must_do",
]);
export type StepOwner = z.infer<typeof StepOwner>;

export const SetupStep = z.object({
  order: z.number().int(),
  title: z.string(),
  description: z.string(),
  owner: StepOwner,
  estimatedMinutes: z.number().int().optional(),
  evidence: SourcedClaim.optional(),
});
export type SetupStep = z.infer<typeof SetupStep>;

export const ScopeTier = z.object({
  scopeName: z.string(),
  triggersReview: z.boolean(),
  notes: SourcedClaim,
});
export type ScopeTier = z.infer<typeof ScopeTier>;

export const Blocker = z.object({
  reason: z.string(),
  workaround: z.string().optional(),
  evidence: SourcedClaim,
});
export type Blocker = z.infer<typeof Blocker>;

export const ManagedAuthStatus = z.object({
  checked: z.boolean(),
  // null = Composio lookup ran but could not determine availability
  available: z.boolean().nullable(),
  authScheme: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  note: z.string().optional(),
});
export type ManagedAuthStatus = z.infer<typeof ManagedAuthStatus>;

export const GuideSchema = z.object({
  slug: z.string(),
  appName: z.string(),
  appUrl: z.string().url().optional(),
  providerDocsUrl: z.string().url().optional(),
  developerPortalUrl: z.string().url().optional(),

  verdict: z.object({
    difficultyTier: DifficultyTier,
    timeToFirstTestConnection: z.string(),
    timeToProductionApproval: z.string(),
    summary: z.string(),
  }),

  prerequisites: z.array(SourcedClaim),
  steps: z.array(SetupStep),
  scopesAndTiers: z.array(ScopeTier),
  blockers: z.array(Blocker),
  managedAuth: ManagedAuthStatus,

  evidenceSummary: z.object({
    testedCount: z.number().int(),
    documentedCount: z.number().int(),
    reportedCount: z.number().int(),
    uncertainCount: z.number().int(),
  }),

  source: z.enum(["handcrafted", "generated"]),
  generatedAt: z.string(),
  pipelineVersion: z.string().optional(),
});
export type Guide = z.infer<typeof GuideSchema>;

/** Used for the Draft pipeline step: the agent doesn't know the slug/source/generatedAt
 * ahead of time, so it only fills in the content fields. The route handler stamps the rest. */
export const DraftedGuideSchema = GuideSchema.omit({
  slug: true,
  source: true,
  generatedAt: true,
  pipelineVersion: true,
  evidenceSummary: true,
});
export type DraftedGuide = z.infer<typeof DraftedGuideSchema>;

/** Computes the evidenceSummary counts by walking every SourcedClaim in the guide. */
export function computeEvidenceSummary(
  guide: Omit<Guide, "evidenceSummary">
): Guide["evidenceSummary"] {
  const claims: SourcedClaim[] = [
    ...guide.prerequisites,
    ...guide.steps.map((s) => s.evidence).filter((e): e is SourcedClaim => !!e),
    ...guide.scopesAndTiers.map((s) => s.notes),
    ...guide.blockers.map((b) => b.evidence),
  ];
  const counts = { TESTED: 0, DOCUMENTED: 0, REPORTED: 0, UNCERTAIN: 0 };
  for (const claim of claims) counts[claim.evidence]++;
  return {
    testedCount: counts.TESTED,
    documentedCount: counts.DOCUMENTED,
    reportedCount: counts.REPORTED,
    uncertainCount: counts.UNCERTAIN,
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
