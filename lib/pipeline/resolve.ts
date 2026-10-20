import { generateText } from "ai";
import { flashModel, googleSearchTool } from "@/lib/ai/model";
import { withBackoff } from "@/lib/ai/retry";
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
 * developer portal, and official OAuth docs page, via a grounded search.
 * Deliberately a separate, narrow call from Research so the pipeline's
 * first streamed step reflects real work (finding the right URLs) rather
 * than a cosmetic delay.
 */
export async function resolveApp(input: string): Promise<ResolvedApp> {
  const result = await withBackoff(() =>
    generateText({
      model: flashModel,
      tools: { google_search: googleSearchTool },
      prompt: `A developer wants to set up OAuth / "Sign in with ${input}" for their app. Figure out:
1. The canonical product/company name behind "${input}".
2. Its public website URL.
3. Its developer portal URL (where a developer registers an app / creates API credentials).
4. Its official OAuth or API authentication documentation page.

Use web search to find real, current URLs. If you cannot confidently find one of these, write "unknown" for that field -- never guess a URL.

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
