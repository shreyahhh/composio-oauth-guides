import { generateText } from "ai";
import { flashModel } from "@/lib/ai/model";
import { withBackoff } from "@/lib/ai/retry";
import { tavilySearch } from "@/lib/search/tavily";
import type { ResolvedApp } from "./types";

const FIELD_RE = {
  appName: /APP_NAME:\s*(.+)/i,
  appUrl: /APP_URL:\s*(\S+)/i,
  developerPortalUrl: /DEVELOPER_PORTAL_URL:\s*(\S+)/i,
  providerDocsUrl: /PROVIDER_DOCS_URL:\s*(\S+)/i,
};

function extractField(text: string, re: RegExp): string | undefined {
  const m = text.match(re);
  const v = m?.[1]?.trim();
  return v && v.toLowerCase() !== "unknown" ? v : undefined;
}

/**
 * Turns a free-text app name or URL into the provider's canonical name,
 * developer portal, and official OAuth docs page. Runs a real Tavily search
 * first, then asks the model to pick the right URLs out of those results --
 * the model is never allowed to invent a URL that isn't in the search
 * results, since Groq's free tier has no grounding tool of its own.
 */
export async function resolveApp(input: string): Promise<ResolvedApp> {
  const results = await tavilySearch(`${input} OAuth app developer portal official API documentation`, 6);

  const resultsBlock = results.length
    ? results.map((r, i) => `[${i + 1}] ${r.url} -- ${r.title}\n${r.content}`).join("\n\n")
    : "(no search results found)";

  const result = await withBackoff(() =>
    generateText({
      model: flashModel,
      maxRetries: 0,
      prompt: `A developer wants to set up OAuth / "Sign in with ${input}" for their app. Using ONLY the search results below, figure out:
1. The canonical product/company name behind "${input}".
2. Its public website URL.
3. Its developer portal URL (where a developer registers an app / creates API credentials).
4. Its official OAuth or API authentication documentation page.

SEARCH RESULTS:
${resultsBlock}

Only use a URL that literally appears in the search results above. If none of the results give you a confident answer for a field, write "unknown" for that field -- never guess or construct a URL yourself.

Respond in exactly this format, one field per line, no extra commentary:
APP_NAME: <name>
APP_URL: <url or unknown>
DEVELOPER_PORTAL_URL: <url or unknown>
PROVIDER_DOCS_URL: <url or unknown>`,
    })
  );

  const text = result.text;
  return {
    appName: extractField(text, FIELD_RE.appName) ?? input,
    appUrl: extractField(text, FIELD_RE.appUrl),
    developerPortalUrl: extractField(text, FIELD_RE.developerPortalUrl),
    providerDocsUrl: extractField(text, FIELD_RE.providerDocsUrl),
  };
}
