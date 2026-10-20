import { createGroq } from "@ai-sdk/groq";

// Groq's free tier is rate-limited, not credit-limited (no card required,
// ever) -- chosen specifically to avoid Google AI Studio's prepay-wallet
// requirement. Its own built-in web-search tool is a paid add-on though, so
// grounding is done separately via Tavily (lib/search/tavily.ts) rather than
// a provider-native tool. Groq's model catalog turns over fast (e.g.
// llama-3.3-70b-versatile was already retired by build time) -- verify
// against `GET https://api.groq.com/openai/v1/models` with your own key, or
// console.groq.com/docs/models, before trusting this default. Override via
// GROQ_MODEL if you want a different hosted model.
const MODEL_ID = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const flashModel = groq(MODEL_ID);
export const MODEL_VERSION = MODEL_ID;
