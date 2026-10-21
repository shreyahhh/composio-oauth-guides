/**
 * Findings from actually running the live pipeline on 2026-10-21 against
 * all four library apps (github-generated, google-generated,
 * notion-generated, spotify-generated) and comparing the output against the
 * hand-researched, source-checked guides (app/guides/github, google, notion,
 * spotify). See README "Evidence & Verification" for how this fits into the
 * overall evidence story.
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
        category: "wrong",
        note: "Attached a hallucinated source to a real claim: the \"token exchange returns access_token and expires_in\" step cites https://www.signicat.com/.../norwegian-bank-id -- a blog post about Norwegian BankID, unrelated to GitHub. The Critic's \"is this URL in the search results\" check passed because a generic OAuth explainer surfaced in the search, but it doesn't actually verify GitHub-specific behavior. This is the clearest evidence that source-presence is not the same as source-relevance.",
      },
      {
        category: "missing",
        note: "Skipped the actual OAuth App registration step entirely (Settings -> Developer settings -> New OAuth App, filling in name/homepage/callback URL, generating a client secret) and jumped straight to the authorization-code-exchange flow. The assignment is about setting up the OAuth app itself, not just calling it once it exists -- this is the single biggest gap between the two guides.",
      },
      {
        category: "missing",
        note: "developerPortalUrl and appUrl both came back null; the handcrafted guide has https://github.com/settings/developers and https://github.com. The resolve/draft steps didn't bother to look these up even though they're trivial to find.",
      },
      {
        category: "missing",
        note: "scopesAndTiers is a single generic \"any\" entry with UNCERTAIN evidence, versus the handcrafted guide naming concrete scopes (repo, read:user) with a DOCUMENTED citation. The agent had a source confirming no scope-based review exists but defaulted to hedging instead of citing it.",
      },
    ],
  },
  {
    slug: "google",
    appName: "Google / Gmail",
    findings: [
      {
        category: "wrong",
        note: "Mislabeled the overall difficultyTier as self_serve. Its own step list includes a step literally titled \"Await Google review\" with a 2-8 week estimate for restricted scopes -- the tier contradicts the body of the guide it generated. The handcrafted guide calls this heavy_review, which is the answer that actually matches a developer's \"how hard will this be\" question.",
      },
      {
        category: "wrong",
        note: "developerPortalUrl points to developers.google.com/identity/sign-in/web/sign-in -- the deprecated Google Sign-In for Web library, superseded by Google Identity Services years ago. The handcrafted guide correctly links the live Cloud Console consent-screen page.",
      },
      {
        category: "wrong",
        note: "Sourcing looks broader than it is: 6 of 9 steps and most prerequisites all cite the exact same generic landing page (developers.google.com/identity/protocols/oauth2) regardless of which specific sub-step they're attached to. The Critic marked all of them DOCUMENTED because the URL appeared in search results, but a single top-level page can't actually substantiate 6 unrelated specific claims -- this inflates confidence without inflating real verification.",
      },
      {
        category: "missing",
        note: "No mention anywhere of the 100-test-user cap or the 7-day token expiry for test users -- a concrete limit a developer testing the integration will hit almost immediately, and one the handcrafted guide calls out with a direct citation.",
      },
      {
        category: "missing",
        note: "Folds the CASA security assessment for restricted scopes into a generic \"2-8 weeks\" review estimate instead of naming it as a separate, slower, paid, annually-renewed process on top of ordinary verification -- which is the detail that actually changes a developer's planning for apps like Gmail-read access.",
      },
      {
        category: "correct",
        note: "The 9-step breakdown of the real Cloud Console flow (create project -> enable APIs -> consent screen -> create client ID -> redirect URIs -> test -> verification -> review -> deploy) is more granular and more actionable than the handcrafted 4-step version. Despite the wrong top-level tier, the step-by-step mechanics the agent produced are genuinely good and arguably better scaffolding than the hand-written guide.",
      },
      {
        category: "correct",
        note: "Time-to-first-test-connection (\"under 5 minutes\", no verification needed in Testing mode) matches the handcrafted guide's ~20 minutes -- same conclusion, reasonable estimate variance.",
      },
    ],
  },
  {
    slug: "notion",
    appName: "Notion",
    findings: [
      {
        category: "missing",
        note: "Completely missed the public Integration Gallery review (5-10 business days) -- the one real wait a developer would hit -- and reported timeToProductionApproval as \"unknown\" instead. The resolve step also failed to find Notion's own authorization docs (providerDocsUrl came back null) even though a sibling Notion docs page (developers.notion.com/reference/request-limits) was found later in the same run -- the primary source was findable, the agent just didn't look for it specifically.",
      },
      {
        category: "wrong",
        note: "Sourced the core \"how OAuth works here\" claims from a third-party blog (ones.com/blog/...) instead of Notion's own docs.notion.com/docs/authorization, which is the handcrafted guide's primary source and is one search result away. Secondary-source-over-primary-source is a quieter version of the same sourcing-quality problem seen on GitHub and Google.",
      },
      {
        category: "missing",
        note: "Missed the one real blocker a developer could regret: that the installation-scope choice (Any workspace vs. Selected workspaces) can't be changed after creation. Its only blocker is generic API rate-limiting (3 req/s) -- a real but much less consequential fact, and one about using the API rather than setting up OAuth, which is scope creep away from what the assignment actually asks about.",
      },
      {
        category: "missing",
        note: "timeToFirstTestConnection came back \"unknown\" even though \"no review gate exists\" (which the agent itself states in the verdict summary) is enough to infer a short, immediate setup -- the handcrafted guide confidently says ~15 minutes from the same absence-of-review fact.",
      },
    ],
  },
  {
    slug: "spotify",
    appName: "Spotify",
    findings: [
      {
        category: "wrong",
        note: "The single most load-bearing fact in the entire Spotify guide -- that Development Mode caps a new app at 5 real authorized users, full stop, until a separate review clears -- is absent. None of the 5 generated setup steps, prerequisites, or blockers mention a user cap at all. A developer following only this guide would be surprised the moment a 6th person tries to log in.",
      },
      {
        category: "wrong",
        note: "Also missed that Extended Quota Mode has been organization-only (not individuals) since May 15, 2025 -- a hard eligibility gate that can block a solo developer outright, not just slow them down. Worth noting precisely: the handcrafted guide's own file comment documents a *different*, specific correction from an earlier research pass -- the development-mode user cap was originally assumed to be 25 and is actually 5 -- so this app's numbers are demonstrably easy to get wrong even with care. The org-only rule wasn't flagged there as a prior error, just as additional verified detail, but the live agent missing it here fits the same broader pattern: precise eligibility/quota numbers are exactly where this app's research goes wrong.",
      },
      {
        category: "missing",
        note: "difficultyTier came back light_review vs. the handcrafted heavy_review -- a direct consequence of the two misses above. Without the user-cap and org-only facts, the agent has no basis to flag this as the hardest-gated app in the library, which it is.",
      },
      {
        category: "correct",
        note: "Two prerequisites sourced from a Spotify Community forum thread (a demo video and a scope justification list are required for quota-extension requests) were honestly labeled REPORTED rather than DOCUMENTED -- exactly the right call for a user-forum source, and a real, useful detail the handcrafted guide doesn't mention.",
      },
      {
        category: "correct",
        note: "providerDocsUrl and developerPortalUrl were both found correctly (developer.spotify.com/.../authorization and developer.spotify.com) -- unlike the GitHub and Notion runs, where one or both came back null. Resolve-step reliability for these fields varies by app rather than failing consistently.",
      },
      {
        category: "correct",
        note: "The six-week Extended Quota Mode review estimate matches the handcrafted guide's \"up to six weeks\" exactly.",
      },
    ],
  },
];
