import { createGroq } from "@ai-sdk/groq";

// Groq's free tier is rate-limited, not credit-limited (no card required,
// ever) -- chosen specifically to avoid Google AI Studio's prepay-wallet
// requirement. Its own built-in web-search tool is a paid add-on though, so
// grounding is done separately via Tavily (lib/search/tavily.ts) rather than
// a provider-native tool. Override via GROQ_MODEL if you want a different
// hosted model (check console.groq.com/docs/models for current options and
// your own per-model rate limits -- these vary by model and change often).
const MODEL_ID = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const flashModel = groq(MODEL_ID);
export const MODEL_VERSION = MODEL_ID;
