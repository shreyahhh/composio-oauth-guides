import { google } from "@ai-sdk/google";

// Floating "latest" alias so this doesn't go stale as Google ships new models --
// their own docs no longer publish a universal free-tier rate-limit table, so
// check your AI Studio console for current numbers rather than trusting a
// hardcoded figure here. Override via GEMINI_MODEL if you want to pin a version.
const MODEL_ID = process.env.GEMINI_MODEL || "gemini-flash-latest";

export const flashModel = google(MODEL_ID);
export const googleSearchTool = google.tools.googleSearch({});
export const MODEL_VERSION = MODEL_ID;
