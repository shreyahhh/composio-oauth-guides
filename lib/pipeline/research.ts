import { generateText } from "ai";
import { flashModel } from "@/lib/ai/model";
import { withBackoff } from "@/lib/ai/retry";
import { fetchAndExtract } from "@/lib/readability";
import { tavilySearch } from "@/lib/search/tavily";
import type { ResolvedApp, ResearchResult, ResearchSource } from "./types";

const MAX_DOC_CHARS = 8000;

/**
 * Reads the official docs page directly (if we found one) via Readability,
 * runs a Tavily search to fill gaps and check community-reported nuances,
 * then asks the model to synthesize a narrative from ONLY those two
 * sources. The source list returned here is built directly from what
 * Tavily/Readability actually fetched -- not from the model's self-report --
 * so Draft and Critic always have a ground-truth list to check claims
 * against.
 */
export async function researchApp(resolved: ResolvedApp): Promise<ResearchResult> {
  let officialDocsText: string | null = null;
  if (resolved.providerDocsUrl) {
    const page = await fetchAndExtract(resolved.providerDocsUrl);
    officialDocsText = page.text ? page.text.slice(0, MAX_DOC_CHARS) : null;
  }

  const searchResults = await tavilySearch(
    `${resolved.appName} OAuth app review process verification required scopes rate limits approval time`,
    8
  );

  const sources: ResearchSource[] = [];
  if (resolved.providerDocsUrl && officialDocsText) {
    sources.push({ url: resolved.providerDocsUrl, title: "Official docs" });
  }
  for (const r of searchResults) {
    if (!sources.some((s) => s.url === r.url)) sources.push({ url: r.url, title: r.title });
  }

  const officialDocsBlock = officialDocsText
    ? `OFFICIAL DOCS (${resolved.providerDocsUrl}), already fetched for you -- treat as DOCUMENTED:\n"""\n${officialDocsText}\n"""\n`
    : `(Could not fetch the official docs page directly.)\n`;

  const searchBlock = searchResults.length
    ? searchResults.map((r, i) => `[${i + 1}] ${r.url} -- ${r.title}\n${r.content}`).join("\n\n")
    : "(no search results found)";

  const result = await withBackoff(() =>
    generateText({
      model: flashModel,
      prompt: `You are researching how a developer sets up and gets approved for an OAuth app with "${resolved.appName}" (developer portal: ${resolved.developerPortalUrl ?? "unknown"}), so their own app's users can connect their ${resolved.appName} accounts.

Use ONLY the two source blocks below -- the official docs text and the search results. These are the only sources available to you; do not rely on general background knowledge for anything you present as a fact, and say explicitly when something isn't covered by these sources.

${officialDocsBlock}

SEARCH RESULTS:
${searchBlock}

Research and report on, in prose, each of the following, prefer the official docs block over the search results when they overlap:
1. Difficulty: is this self-serve (no review), light review (review queue, usually fast), heavy review (verification / security assessment, can take weeks), or gated behind a partner program?
2. Prerequisites: developer account type needed, business verification, domain verification, privacy policy / ToS URLs, demo video, etc.
3. Ordered setup steps: what exactly do you click/fill in, and at which steps does the developer need to log in, accept legal terms, prove identity, or pay -- versus steps an automation agent could fill in for them.
4. Scopes and tiers: which OAuth scopes trigger manual review, and any test-user or rate limits that apply before full approval.
5. Blockers: common rejection reasons and known workarounds (e.g. a "testing" or "development" mode that works without approval).
6. Realistic time estimates: time to get a first working test connection, and realistic time to production approval including any waiting on a review queue.

Be concrete. If the sources above don't cover something or conflict, say so explicitly rather than guessing -- the next step in this pipeline will downgrade any unsupported claim to "uncertain," so do not state something as fact if the sources don't actually back it.`,
    })
  );

  return { narrative: result.text, sources };
}
