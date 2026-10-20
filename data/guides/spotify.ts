import type { HandcraftedGuideInput } from "./types";

// Researched from Spotify's own docs (fetched directly) -- NOT hands-on
// tested. Per the build plan, create an app in the dashboard and confirm
// the development-mode user cap yourself, then upgrade the matching
// evidence labels below to "TESTED".
//
// CORRECTION vs. the original build plan: the plan assumed a "25-user"
// development-mode cap from general research. Spotify's current docs state
// the cap is actually 5 users, and as of May 15, 2025 only organizations
// (not individuals) can apply for Extended Quota Mode. This file uses the
// verified numbers.
const CHECKED = "2026-10-21";
const QUOTA_DOCS_URL = "https://developer.spotify.com/documentation/web-api/concepts/quota-modes";

export const spotifyGuide: HandcraftedGuideInput = {
  appName: "Spotify",
  appUrl: "https://open.spotify.com",
  providerDocsUrl: QUOTA_DOCS_URL,
  developerPortalUrl: "https://developer.spotify.com/dashboard",

  verdict: {
    difficultyTier: "heavy_review",
    timeToFirstTestConnection: "~15 minutes",
    timeToProductionApproval:
      "Immediate for up to 5 authorized users (Development Mode); up to 6 weeks for Extended Quota Mode, and only organizations (not individuals) can apply as of May 2025",
    summary:
      "Spotify gates production access with a hard user quota rather than a pre-launch review: you can test immediately but only 5 real users can ever authorize your app until you clear a multi-week Extended Quota Mode application -- and that application now requires being a registered organization.",
  },

  prerequisites: [
    {
      text: "No special account type needed to create an app and reach Development Mode.",
      evidence: "DOCUMENTED",
      sourceUrl: QUOTA_DOCS_URL,
      lastChecked: CHECKED,
    },
    {
      text: "As of May 15, 2025, Spotify only accepts Extended Quota Mode applications from organizations (not individuals), submitted via company email through their official form.",
      evidence: "DOCUMENTED",
      sourceUrl: QUOTA_DOCS_URL,
      lastChecked: CHECKED,
    },
  ],

  steps: [
    {
      order: 1,
      title: "Create an app in the Spotify Developer Dashboard",
      description: "Starts in Development Mode by default -- no waiting required.",
      owner: "you_must_do",
      estimatedMinutes: 5,
      evidence: null,
    },
    {
      order: 2,
      title: "Authorize up to 5 real Spotify accounts for testing",
      description: "\"Up to 5 authenticated Spotify users can use an app that is in development mode.\"",
      owner: "agent_can_do",
      estimatedMinutes: 5,
      evidence: {
        text: "Development mode apps are limited to 5 authenticated users.",
        evidence: "DOCUMENTED",
        sourceUrl: QUOTA_DOCS_URL,
        lastChecked: CHECKED,
      },
    },
    {
      order: 3,
      title: "Apply for Extended Quota Mode once you need more than 5 users",
      description: "Submit the official extension request form as a registered organization with a company email.",
      owner: "you_must_do",
      estimatedMinutes: 30,
      evidence: {
        text: "Requirements include an established business entity, an active/launched service, at least 250k MAUs, availability in key Spotify markets, commercial viability, and adherence to terms.",
        evidence: "DOCUMENTED",
        sourceUrl: QUOTA_DOCS_URL,
        lastChecked: CHECKED,
      },
    },
  ],

  scopesAndTiers: [
    {
      scopeName: "all Web API scopes",
      triggersReview: false,
      notes: {
        text: "Scopes themselves aren't individually reviewed -- the gate is the Development/Extended Quota Mode user cap, not scope-by-scope approval.",
        evidence: "DOCUMENTED",
        sourceUrl: QUOTA_DOCS_URL,
        lastChecked: CHECKED,
      },
    },
  ],

  blockers: [
    {
      reason: "The 5-user Development Mode cap blocks any real launch beyond a handful of testers.",
      workaround: "Apply for Extended Quota Mode early -- the review can take up to six weeks.",
      evidence: {
        text: "\"The app review team will review the information that you have provided, test out your app and send you feedback by email... This review process can take up to six weeks.\"",
        evidence: "DOCUMENTED",
        sourceUrl: QUOTA_DOCS_URL,
        lastChecked: CHECKED,
      },
    },
    {
      reason: "Individual developers (not registered organizations) cannot apply for Extended Quota Mode at all as of May 2025.",
      workaround: null,
      evidence: {
        text: "\"Spotify only accepts applications from organizations (not individuals)\" for quota extension as of May 15, 2025.",
        evidence: "DOCUMENTED",
        sourceUrl: QUOTA_DOCS_URL,
        lastChecked: CHECKED,
      },
    },
  ],
};
