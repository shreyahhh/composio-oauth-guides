import type { HandcraftedGuideInput } from "./types";

// Researched from Google's own docs (fetched directly) -- NOT hands-on
// tested. Per the build plan, create the OAuth consent screen in Testing
// mode yourself (free, no verification needed up to 100 test users), then
// upgrade the matching evidence labels below to "TESTED". Do NOT attempt to
// actually complete production verification or a CASA security assessment --
// those require a real business and cost money; this guide only documents
// what they involve.
const CHECKED = "2026-10-21";
const BRAND_VERIFICATION_URL = "https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification";
const TEST_USERS_URL = "https://support.google.com/cloud/answer/15549945";
const RESTRICTED_SCOPE_URL = "https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification";

export const googleGuide: HandcraftedGuideInput = {
  appName: "Google",
  appUrl: "https://google.com",
  providerDocsUrl: BRAND_VERIFICATION_URL,
  developerPortalUrl: "https://console.cloud.google.com/apis/credentials/consent",

  verdict: {
    difficultyTier: "heavy_review",
    timeToFirstTestConnection: "~20 minutes (Testing mode, up to 100 test users, no verification needed)",
    timeToProductionApproval:
      "2-3 business days for basic brand verification; 2-4 weeks for app verification with sensitive scopes; a few weeks to several months for a security assessment (CASA) if you request restricted scopes, renewed annually",
    summary:
      "You can build and test against Google's APIs for free within minutes in Testing mode. The multi-week wait only hits when you publish to production with a branded consent screen and/or request sensitive or restricted scopes -- and restricted scopes add a security assessment on top of verification.",
  },

  prerequisites: [
    {
      text: "A Google Cloud project with an OAuth consent screen configured; no business verification is required to stay in Testing mode.",
      evidence: "DOCUMENTED",
      sourceUrl: BRAND_VERIFICATION_URL,
      lastChecked: CHECKED,
    },
    {
      text: "Verification applies when your app's user type is External and publishing status is Published, or when you want your app to show a logo/display name on the consent screen.",
      evidence: "DOCUMENTED",
      sourceUrl: BRAND_VERIFICATION_URL,
      lastChecked: CHECKED,
    },
  ],

  steps: [
    {
      order: 1,
      title: "Configure the OAuth consent screen and keep Publishing status = Testing",
      description: "No verification is required in Testing mode -- you can start authorizing test users immediately.",
      owner: "you_must_do",
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: "Add up to 100 test users",
      description: "Testing-mode apps have a hard cap of 100 listed test users; their authorizations expire 7 days after consent, and they see an \"unverified app\" warning.",
      owner: "agent_can_assist",
      estimatedMinutes: 5,
      evidence: {
        text: "\"This hard cap of 100 test users is a security measure that applies to all apps in Testing mode\"; test-user authorizations \"expire seven days from the time of consent.\"",
        evidence: "DOCUMENTED",
        sourceUrl: TEST_USERS_URL,
        lastChecked: CHECKED,
      },
    },
    {
      order: 3,
      title: "Publish to production and request brand verification",
      description: "Needed once you move the app to Published status or want your logo/name shown on the consent screen.",
      owner: "you_must_do",
      estimatedMinutes: 30,
      evidence: {
        text: "Brand verification \"typically takes a few minutes... in some cases usually takes 2-3 business days.\"",
        evidence: "DOCUMENTED",
        sourceUrl: BRAND_VERIFICATION_URL,
        lastChecked: CHECKED,
      },
    },
    {
      order: 4,
      title: "If requesting sensitive or restricted scopes, request scope verification",
      description: "A separate, slower process from brand verification -- restricted scopes additionally require a security assessment.",
      owner: "you_must_do",
      estimatedMinutes: 60,
      evidence: {
        text: "General app verification for sensitive scopes: 2-4 weeks. Restricted scopes additionally require a CASA security assessment, commonly taking a few weeks to several months depending on app complexity, renewed every 12 months.",
        evidence: "REPORTED",
        lastChecked: CHECKED,
      },
    },
  ],

  scopesAndTiers: [
    {
      scopeName: "sensitive scopes (e.g. broad Gmail/Drive read access)",
      triggersReview: true,
      notes: {
        text: "Requires app verification, typically 2-4 weeks, before use in production with External users.",
        evidence: "REPORTED",
        lastChecked: CHECKED,
      },
    },
    {
      scopeName: "restricted scopes (e.g. full Gmail access, Google Workspace admin)",
      triggersReview: true,
      notes: {
        text: "Requires verification plus an annual CASA security assessment; \"you must have a published branding status before you can request verification for data access.\"",
        evidence: "DOCUMENTED",
        sourceUrl: RESTRICTED_SCOPE_URL,
        lastChecked: CHECKED,
      },
    },
  ],

  blockers: [
    {
      reason: "Restricted scopes require a paid-for, multi-week-to-months security assessment, renewed annually.",
      workaround: "Stay in Testing mode (free, up to 100 users, 7-day token expiry) while you validate product-market fit before paying for assessment.",
      evidence: {
        text: "Security assessment timelines and the annual renewal requirement are reported consistently across third-party verification-process guides, though exact current cost and duration are not published by Google in a single authoritative number -- treat the \"few weeks to months\" estimate as directional.",
        evidence: "REPORTED",
        lastChecked: CHECKED,
      },
    },
  ],
};
