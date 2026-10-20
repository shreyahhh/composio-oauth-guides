import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export type ExtractedPage = {
  url: string;
  title: string | null;
  text: string | null;
};

/**
 * Fetches a page and extracts its main article text via Readability.
 * Returns text: null (not throwing) on any failure so a single bad URL
 * doesn't abort the whole Research step -- the caller just skips it.
 */
export async function fetchAndExtract(url: string, timeoutMs = 15000): Promise<ExtractedPage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OAuthGuideBot/0.1)" },
    });
    if (!res.ok) return { url, title: null, text: null };
    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const parsed = new Readability(dom.window.document).parse();
    return { url, title: parsed?.title ?? null, text: parsed?.textContent?.trim() ?? null };
  } catch {
    return { url, title: null, text: null };
  } finally {
    clearTimeout(timeout);
  }
}
