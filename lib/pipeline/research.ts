import { generateText } from "ai";
import { flashModel } from "@/lib/ai/model";
import { withBackoff } from "@/lib/ai/retry";
import { fetchAndExtract } from "@/lib/readability";
import { tavilySearch } from "@/lib/search/tavily";
import type { ResolvedApp, ResearchResult, ResearchSource } from "./types";

// Kept deliberately small: Groq's free tier has an 8,000 tokens/minute
// budget per model, and this text gets echoed again (in full) into the
// Draft prompt right after this call -- a large narrative here was
// blowing that budget on a single Draft request, triggering 429s that a
// short backoff couldn't recover from (per-minute limits need tens of
// seconds, not a 1-4s exponential backoff, to reset).
const MAX_DOC_CHARS = 4000;
const MAX_NARRATIVE_CHARS = 4000;
// Short enough that threading all ~10 sources' content into the Critic's
// prompt later (lib/pipeline/critic.ts) stays within the same per-minute
// token budget -- just enough for the Critic to judge topical relevance,
// not a full re-read of each page.
const MAX_SOURCE_SNIPPET_CHARS = 300;

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

  // Two targeted queries instead of one generic one: a general setup/review
  // query, plus a query aimed specifically at the kind of hard gate a
  // developer most needs to know about (a user cap, an eligibility
  // restriction) -- a generic "review process" query reliably surfaces
  // review-queue timing but was consistently missing quota/cap/eligibility
  // specifics (e.g. Spotify's 5-user Development Mode cap, its org-only
  // Extended Quota Mode rule, Notion's Integration Gallery window) in
  // evidence-findings.ts's self-check. Run in parallel -- independent calls.
  const [searchResults, gateResults] = await Promise.all([
    tavilySearch(
      `${resolved.appName} OAuth app review process verification required scopes rate limits approval time`,
      5
    ),
    tavilySearch(
      `${resolved.appName} OAuth API user limit quota cap eligibility requirements "who can apply" individual developer organization public gallery marketplace directory listing submission review`,
      4
    ),
  ]);

  const sources: ResearchSource[] = [];
  if (resolved.providerDocsUrl && officialDocsText) {
    sources.push({
      url: resolved.providerDocsUrl,
      title: "Official docs",
      content: officialDocsText.slice(0, MAX_SOURCE_SNIPPET_CHARS),
    });
  }
  for (const r of [...searchResults, ...gateResults]) {
    if (!sources.some((s) => s.url === r.url)) {
      sources.push({ url: r.url, title: r.title, content: r.content.slice(0, MAX_SOURCE_SNIPPET_CHARS) });
    }
  }

  const officialDocsBlock = officialDocsText
    ? `OFFICIAL DOCS (${resolved.providerDocsUrl}), already fetched for you -- treat as DOCUMENTED:\n"""\n${officialDocsText}\n"""\n`
    : `(Could not fetch the official docs page directly.)\n`;

  const searchBlock = searchResults.length
    ? searchResults.map((r, i) => `[${i + 1}] ${r.url} -- ${r.title}\n${r.content}`).join("\n\n")
    : "(no search results found)";

  const gateBlock = gateResults.length
    ? gateResults.map((r, i) => `[G${i + 1}] ${r.url} -- ${r.title}\n${r.content}`).join("\n\n")
    : "(no results found for the gate/eligibility search)";

  const result = await withBackoff(() =>
    generateText({
      model: flashModel,
      maxRetries: 0,
      prompt: `You are researching how a developer sets up and gets approved for an OAuth app with "${resolved.appName}" (developer portal: ${resolved.developerPortalUrl ?? "unknown"}), so their own app's users can connect their ${resolved.appName} accounts.

Use ONLY the three source blocks below -- the official docs text and the two search result sets. These are the only sources available to you; do not rely on general background knowledge for anything you present as a fact, and say explicitly when something isn't covered by these sources.

${officialDocsBlock}

SEARCH RESULTS (general setup/review process):
${searchBlock}

GATE/ELIGIBILITY SEARCH RESULTS (user limits, quotas, who's allowed to apply):
${gateBlock}

Research and report on, in prose, each of the following, prefer the official docs block over the search results when they overlap:
1. Difficulty: is this self-serve (no review), light review (review queue, usually fast), heavy review (verification / security assessment, can take weeks), or gated behind a partner program? Base this specifically on whether a hard cap, quota, or eligibility restriction exists (check the GATE/ELIGIBILITY block above) -- a provider with no pre-launch review but a hard user cap or an organization-only eligibility rule is NOT self-serve, because that cap or rule is itself the blocker a developer hits. Also check for a SEPARATE, OPTIONAL review: some providers let basic OAuth work immediately but gate a public app gallery/marketplace/directory listing behind its own days-long review (e.g. Notion's Integration Gallery) -- if that exists, this is at least light review even though basic functionality itself is self-serve, because getting discoverable/trusted by real users still requires waiting on that queue.
2. Prerequisites: developer account type needed, business verification, domain verification, privacy policy / ToS URLs, demo video, etc.
3. Ordered setup steps: what exactly do you click/fill in, and at which steps does the developer need to log in, accept legal terms, prove identity, or pay -- versus steps an automation agent could fill in for them.
4. Scopes and tiers: which OAuth scopes trigger manual review, and any test-user or rate limits that apply before full approval.
5. Blockers: common rejection reasons and known workarounds (e.g. a "testing" or "development" mode that works without approval). Explicitly check the GATE/ELIGIBILITY block for a hard numeric user/request cap, any rule restricting who is even eligible to apply (e.g. organizations only, minimum user count, approved countries), AND any optional public gallery/marketplace/directory listing review with its own separate timeline -- these are usually the single most important blocker and are easy to miss if you only read the general search results.
6. Realistic time estimates: time to get a first working test connection, and realistic time to production approval including any waiting on a review queue -- and if a public listing review is separate from basic functionality, state both timelines distinctly.

Be concrete. If the sources above don't cover something or conflict, say so explicitly rather than guessing -- the next step in this pipeline will downgrade any unsupported claim to "uncertain," so do not state something as fact if the sources don't actually back it.`,
    })
  );

  return { narrative: result.text.slice(0, MAX_NARRATIVE_CHARS), sources };
}
