import type { HandcraftedGuideInput } from "./types";

// Researched from Notion's own docs (fetched directly) -- NOT hands-on
// tested. Per the build plan, test creating a public integration and the
// internal/public toggle yourself, then upgrade the matching evidence
// labels below to "TESTED".
const CHECKED = "2026-10-21";
const AUTH_DOCS_URL = "https://developers.notion.com/docs/authorization";
const GALLERY_DOCS_URL = "https://developers.notion.com/docs/publishing-integrations-to-notions-integration-gallery";

export const notionGuide: HandcraftedGuideInput = {
  appName: "Notion",
  appUrl: "https://notion.so",
  providerDocsUrl: AUTH_DOCS_URL,
  developerPortalUrl: "https://www.notion.so/my-integrations",

  verdict: {
    difficultyTier: "light_review",
    timeToFirstTestConnection: "~15 minutes",
    timeToProductionApproval:
      "Same day to start authorizing real users via a direct link; 5-10 business days if you also want to be listed in Notion's public Integration Gallery",
    summary:
      "A public integration's OAuth works as soon as you create it -- no review gate. The review Notion runs (5-10 business days) is specifically for getting listed in the public Integration Gallery, which is optional if you distribute your own auth link directly.",
  },

  prerequisites: [
    {
      text: "You must be a workspace owner to create connections in the Notion developer portal.",
      evidence: "DOCUMENTED",
      sourceUrl: AUTH_DOCS_URL,
      lastChecked: CHECKED,
    },
    {
      text: "A redirect URI is required for a public integration: \"The redirect URI is the URI your users will be redirected to after authorizing the public connection.\"",
      evidence: "DOCUMENTED",
      sourceUrl: AUTH_DOCS_URL,
      lastChecked: CHECKED,
    },
  ],

  steps: [
    {
      order: 1,
      title: "Create a new integration as \"Public\"",
      description: "In the Notion developer portal, choose Public rather than Internal -- Public integrations use OAuth 2.0 and can be installed across workspaces.",
      owner: "you_must_do",
      estimatedMinutes: 3,
      evidence: {
        text: "Public integrations are for \"when other Notion users need to install your app,\" vs. internal connections for \"team-owned workspace automations.\"",
        evidence: "DOCUMENTED",
        sourceUrl: AUTH_DOCS_URL,
        lastChecked: CHECKED,
      },
    },
    {
      order: 2,
      title: "Set the installation scope (Any workspace vs. Selected workspaces)",
      description: "This setting cannot be changed after creation, so decide upfront whether any Notion user can install it.",
      owner: "you_must_do",
      estimatedMinutes: 2,
    },
    {
      order: 3,
      title: "Add the redirect URI and note the client credentials",
      description: "The portal issues a CLIENT_ID and CLIENT_SECRET for exchanging authorization codes for tokens.",
      owner: "agent_can_assist",
      estimatedMinutes: 3,
    },
    {
      order: 4,
      title: "(Optional) Submit for the public Integration Gallery",
      description: "Only needed for public discovery/trust badge -- not required for OAuth to function with users you share your own link with.",
      owner: "you_must_do",
      estimatedMinutes: 15,
      evidence: {
        text: "After submission, expect a response within 5-10 business days; rejected integrations get feedback by email and can be revised and resubmitted.",
        evidence: "DOCUMENTED",
        sourceUrl: GALLERY_DOCS_URL,
        lastChecked: CHECKED,
      },
    },
  ],

  scopesAndTiers: [
    {
      scopeName: "workspace content capabilities (read/update/insert content, comments, user info)",
      triggersReview: false,
      notes: {
        text: "Notion's authorization docs describe capability selection in the portal but do not tie it to a manual review step for OAuth itself.",
        evidence: "DOCUMENTED",
        sourceUrl: AUTH_DOCS_URL,
        lastChecked: CHECKED,
      },
    },
  ],

  blockers: [
    {
      reason: "Choosing the wrong installation scope (Any vs. Selected workspaces) can't be changed later.",
      workaround: "Create a second integration if you need to change installation scope.",
      evidence: {
        text: "The installation scope setting \"cannot be changed after creation.\"",
        evidence: "DOCUMENTED",
        sourceUrl: AUTH_DOCS_URL,
        lastChecked: CHECKED,
      },
    },
  ],
};
