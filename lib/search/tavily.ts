export type TavilyResult = { url: string; title: string; content: string };

/**
 * Tavily search (free tier: 1,000 credits/month, no credit card). Used in
 * place of an LLM-provider-native grounding tool (Groq's free tier doesn't
 * include one -- its built-in Web Search tool is a paid add-on). Returning
 * [] on any failure lets the pipeline continue with fewer sources rather
 * than aborting -- consistent with "an honest partial guide, not a
 * confident fake."
 */
export async function tavilySearch(query: string, maxResults = 5, timeoutMs = 15000): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query, max_results: maxResults, search_depth: "basic" }),
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data: { results?: Array<{ url: string; title: string; content: string }> } = await res.json();
    return (data.results ?? []).map((r) => ({ url: r.url, title: r.title, content: r.content }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
