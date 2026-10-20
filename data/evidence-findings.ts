/**
 * Hand-written findings from comparing the live agent's output against the
 * verified handcrafted guide, for the apps chosen for the self-check
 * (GitHub: easy contrast case; Google: hard contrast case). Fill this in
 * after actually running `npm run evidence:generate` once API keys are
 * live -- see README "Evidence & Verification".
 */
export type EvidenceFinding = {
  category: "correct" | "wrong" | "missing";
  note: string;
};

export type EvidenceComparison = {
  slug: string;
  appName: string;
  findings: EvidenceFinding[];
};

export const evidenceComparisons: EvidenceComparison[] = [
  {
    slug: "github",
    appName: "GitHub",
    findings: [
      // TODO: fill in after running the live pipeline against "github" and
      // comparing app/guides/github-generated to the handcrafted app/guides/github.
    ],
  },
  {
    slug: "google",
    appName: "Google / Gmail",
    findings: [
      // TODO: fill in after running the live pipeline against "google" and
      // comparing app/guides/google-generated to the handcrafted app/guides/google.
    ],
  },
];
