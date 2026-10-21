/**
 * Findings from running the live pipeline against all four library apps
 * (github-generated, google-generated, notion-generated, spotify-generated)
 * and comparing the output against the hand-researched, source-checked
 * guides (app/guides/github, google, notion, spotify). See README "Evidence
 * & Verification" for how this fits into the overall evidence story.
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
      {
        category: "correct",
        note: "Got the headline verdict right: self_serve difficulty, test connection works immediately after creating the OAuth App, matching the handcrafted guide.",
      },
      {
        category: "correct",
        note: "Now covers the actual OAuth App registration flow end to end (log in -> Settings -> Developer settings -> OAuth apps -> New OAuth App -> fill in the form -> register -> retrieve client ID/secret) -- 8 steps, where an earlier run skipped registration entirely and jumped straight to the authorization-code-exchange flow. This is web-search variance across runs, not something today's fixes specifically targeted, but it closes what was previously the single biggest gap versus the handcrafted guide.",
      },
      {
        category: "correct",
        note: "The hallucinated-source bug is fixed for its specific failure mode: a claim this unrelated to GitHub (a Norwegian BankID blog, cited via the Critic's recovery search) can no longer get attached, because recovery now requires the candidate result's title/snippet to actually mention \"GitHub\" before accepting it -- a cheap check, but an effective one against wrong-provider sources, since an off-topic page essentially never happens to mention the app by name.",
      },
      {
        category: "wrong",
        note: "The fix isn't a general relevance filter, though: of the 3 claims recovered via extra search this run, one cites Automattic's own privacy-policy template (hosted on github.com, so it passes the app-name check) as evidence that GitHub doesn't require a privacy-policy URL for OAuth apps -- technically mentions \"GitHub\" but doesn't actually substantiate that specific claim. A page merely mentioning the app by name isn't the same as a page being authoritative on the specific point it's cited for; catching that would need real content-relevance judgment, not a keyword check. (All 3 recovered claims were at least correctly labeled REPORTED rather than DOCUMENTED, since none resolved to a recognized docs/developer subdomain -- appropriately hedged confidence even where the source is weak.)",
      },
      {
        category: "missing",
        note: "developerPortalUrl and appUrl both came back null again; the handcrafted guide has https://github.com/settings/developers and https://github.com. This is a resolve-step gap neither of today's fixes touches.",
      },
      {
        category: "missing",
        note: "scopesAndTiers came back empty this run (previously at least a generic \"any\" entry), versus the handcrafted guide naming concrete scopes (repo, read:user) with a DOCUMENTED citation.",
      },
    ],
  },
  {
    slug: "google",
    appName: "Google / Gmail",
    findings: [
      {
        category: "correct",
        note: "difficultyTier is now heavy_review, matching the handcrafted guide. A deterministic post-check scans the guide's own generated steps/blockers/prerequisites for gate signals (multi-week waits, security assessments, quotas) and bumps the tier up when it contradicts the guide's own body -- this is what corrected it.",
      },
      {
        category: "correct",
        note: "Now surfaces the 100-test-user cap for unverified apps as an explicit blocker, correctly labeled REPORTED and sourced to a Stack Overflow thread -- a concrete limit a developer testing the integration hits almost immediately, previously absent entirely.",
      },
      {
        category: "correct",
        note: "Now explicitly names a \"yearly security assessment\" for restricted scopes, rather than folding it into a vague multi-week estimate -- capturing the recurring, ongoing-cost nature of the requirement that matters most for a developer's long-term planning.",
      },
      {
        category: "correct",
        note: "Time-to-first-test-connection (\"a few minutes\", no verification needed in Testing mode) still matches the handcrafted guide's ~20 minutes -- same conclusion, reasonable estimate variance.",
      },
      {
        category: "wrong",
        note: "providerDocsUrl and developerPortalUrl both resolved to the same obscure page -- a Java client library doc (developers.google.com/api-client-library/java/...) -- instead of the actual live Cloud Console consent-screen/credentials page the handcrafted guide links. Resolve's single, generic search query can still latch onto the wrong specific page.",
      },
      {
        category: "wrong",
        note: "Six of seven prerequisites still cite the exact same generic landing page regardless of which specific claim they're attached to -- the source-reuse pattern that inflates apparent confidence without inflating real verification is unchanged.",
      },
      {
        category: "missing",
        note: "Every one of the 7 generated setup steps now has no evidence/sourceUrl attached at all, where the previous run at least (over-)cited one page six times. The step mechanics are still good and more granular than the handcrafted guide's 4 steps, but none of them carry a citation a developer could check.",
      },
    ],
  },
  {
    slug: "notion",
    appName: "Notion",
    findings: [
      {
        category: "correct",
        note: "difficultyTier is no longer self_serve -- it's now heavy_review, correctly indicating a real gate exists (previously the guide said \"expect no formal review\" and reported timeToProductionApproval as \"unknown\"). heavy_review is a step too far versus the handcrafted light_review (a few days of marketplace review is milder than Google's multi-week assessment), but landing on \"there is a wait\" is a vast improvement over confidently claiming there is none.",
      },
      {
        category: "correct",
        note: "The Marketplace/Gallery-style review itself now surfaces directly: \"If you aim to list the integration on the Notion Marketplace you must pass a light security review... a few days to a week\" -- in the right ballpark against the handcrafted guide's \"5-10 business days for the Integration Gallery\". This confirms the new gate-search query and the explicit \"check for an optional public listing review\" research instruction can work when research isn't derailed by a bad source (see next finding).",
      },
      {
        category: "wrong",
        note: "Resolve latched onto an unrelated, official-looking page: developers.notion.com/workers/guides/oauth, which documents Notion's own \"Workers\" automation platform's OAuth capability (a worker.oauth({...}) API) -- not the \"register a public OAuth integration\" flow a third-party developer actually needs. Because the research step treats \"the official docs\" as a privileged source, this wrong page directly contaminated two of the three generated setup steps with irrelevant Workers-specific content (e.g. \"Add OAuth capability to Cloudflare Worker\"). This is a different failure mode than the one just fixed: a single generic resolve query can pick the wrong specific page when a provider's domain hosts multiple, differently-named products that all mention \"OAuth\".",
      },
      {
        category: "wrong",
        note: "With no good primary source to prefer, prerequisites and steps lean on other third-party pages for basic mechanics (e.g. asserting the redirect URI must be exactly \"/oauth/callback\", which is not a real Notion requirement) -- the same secondary-source-over-primary-source problem seen on GitHub, now compounded by resolve having picked the wrong official page in the first place.",
      },
      {
        category: "missing",
        note: "Still doesn't mention the one real blocker a developer could regret: that the installation-scope choice (Any workspace vs. Selected workspaces) can't be changed after creation.",
      },
    ],
  },
  {
    slug: "spotify",
    appName: "Spotify",
    findings: [
      {
        category: "correct",
        note: "difficultyTier is now heavy_review, matching the handcrafted guide (was light_review).",
      },
      {
        category: "correct",
        note: "Now surfaces the real Extended Quota Mode eligibility bar directly: a 250,000-monthly-active-user minimum, availability in key Spotify markets, and a registered legal entity (not an individual) -- all sourced from a Spotify Community thread and correctly labeled REPORTED rather than DOCUMENTED. All three were completely absent before.",
      },
      {
        category: "missing",
        note: "Still never states the single most load-bearing specific number in the whole guide: that Development Mode caps a new app at 5 real authorized users, full stop. The guide now correctly flags that a hard, slow-to-clear gate exists, but a developer still wouldn't know the exact ceiling they'll hit immediately in testing.",
      },
      {
        category: "correct",
        note: "providerDocsUrl and developerPortalUrl both resolved correctly again (developer.spotify.com/.../authorization and developer.spotify.com).",
      },
      {
        category: "correct",
        note: "The six-week Extended Quota Mode review estimate still matches the handcrafted guide's \"up to six weeks\" exactly.",
      },
    ],
  },
];
