import type { HandcraftedGuideInput } from "./types";

// Researched from GitHub's own docs (fetched directly, see sourceUrl fields
// below) -- NOT hands-on tested by this agent. Per the build plan, this is
// the app you should actually walk through end-to-end (create the OAuth
// App, generate a client secret, run the authorization flow). After you do,
// upgrade the relevant evidence labels below from "DOCUMENTED" to "TESTED".
const CHECKED = "2026-10-21";
const DOCS_URL = "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app";

export const githubGuide: HandcraftedGuideInput = {
  appName: "GitHub",
  appUrl: "https://github.com",
  providerDocsUrl: DOCS_URL,
  developerPortalUrl: "https://github.com/settings/developers",

  verdict: {
    difficultyTier: "self_serve",
    timeToFirstTestConnection: "~10 minutes",
    timeToProductionApproval: "Same day -- there is no review or approval process for OAuth Apps",
    summary:
      "You can register a GitHub OAuth App and start authorizing real users the same day -- GitHub's docs describe no review step between registering the app and using it in production.",
  },

  prerequisites: [
    {
      text: "A GitHub account is the only account requirement; the docs do not mention any business or developer-account verification for creating an OAuth App.",
      evidence: "DOCUMENTED",
      sourceUrl: DOCS_URL,
      lastChecked: CHECKED,
    },
  ],

  steps: [
    {
      order: 1,
      title: "Open Developer settings and start a new OAuth App",
      description: "GitHub Settings -> Developer settings -> OAuth Apps -> New OAuth App. Requires being logged in.",
      owner: "you_must_do",
      estimatedMinutes: 2,
      evidence: { text: "Login to github.com is required to reach Developer settings.", evidence: "DOCUMENTED", sourceUrl: DOCS_URL, lastChecked: CHECKED },
    },
    {
      order: 2,
      title: "Fill in Application name, Homepage URL, Authorization callback URL",
      description: "These three fields are the only required fields the docs list for registering the app.",
      owner: "agent_can_assist",
      estimatedMinutes: 3,
      evidence: {
        text: "Docs: \"In 'Application name', type the name of your app\"; \"In 'Homepage URL', type the full URL to your app's website\"; \"In 'Authorization callback URL', type the callback URL of your app.\"",
        evidence: "DOCUMENTED",
        sourceUrl: DOCS_URL,
        lastChecked: CHECKED,
      },
    },
    {
      order: 3,
      title: "Register the application and generate a client secret",
      description: "Click \"Register application,\" then generate a client secret on the resulting app page. Never share this secret.",
      owner: "you_must_do",
      estimatedMinutes: 2,
    },
    {
      order: 4,
      title: "Test the authorization flow",
      description: "Drive a test user through the /login/oauth/authorize URL and exchange the returned code for a token.",
      owner: "agent_can_do",
      estimatedMinutes: 5,
    },
  ],

  scopesAndTiers: [
    {
      scopeName: "any OAuth scope (e.g. repo, read:user)",
      triggersReview: false,
      notes: {
        text: "The docs describe no manual review tied to requested scopes -- only a usage guideline to avoid putting sensitive data in public-facing app fields.",
        evidence: "DOCUMENTED",
        sourceUrl: DOCS_URL,
        lastChecked: CHECKED,
      },
    },
  ],

  blockers: [],
};
