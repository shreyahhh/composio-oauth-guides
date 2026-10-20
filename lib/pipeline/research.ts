import { generateText } from "ai";
import { flashModel, googleSearchTool } from "@/lib/ai/model";
import { withBackoff } from "@/lib/ai/retry";
import { fetchAndExtract } from "@/lib/readability";
import type { ResolvedApp, ResearchResult, ResearchSource } from "./types";

const MAX_DOC_CHARS = 8000;

/**
 * Reads the official docs page directly (if we found one) via Readability,
 * then runs a grounded search to fill gaps and check community-reported
 * nuances -- official docs first, secondary sources second, per the brief.
 */
export async function researchApp(resolved: ResolvedApp): Promise<ResearchResult> {
  let officialDocsText: string | null = null;
  if (resolved.providerDocsUrl) {
    const page = await fetchAndExtract(resolved.providerDocsUrl);
    officialDocsText = page.text ? page.text.slice(0, MAX_DOC_CHARS) : null;
  }

  const officialDocsBlock = officialDocsText
    ? `Here is the extracted text of the official docs page (${resolved.providerDocsUrl}), already fetched for you -- treat this as DOCUMENTED and do not re-search for it:\n\n"""\n${officialDocsText}\n"""\n`
    : `(Could not fetch the official docs page directly -- search for it.)\n`;

  const result = await withBackoff(() =>
    generateText({
      model: flashModel,
      tools: { google_search: googleSearchTool },
      prompt: `You are researching how a developer sets up and gets approved for an OAuth app with "${resolved.appName}" (developer portal: ${resolved.developerPortalUrl ?? "unknown"}), so their own app's users can connect their ${resolved.appName} accounts.

${officialDocsBlock}

Research and report on, in prose, each of the following -- prefer the official docs above, then web search official docs/help center pages, then community sources (forums, blog posts) only if official sources are silent:
1. Difficulty: is this self-serve (no review), light review (review queue, usually fast), heavy review (verification / security assessment, can take weeks), or gated behind a partner program?
2. Prerequisites: developer account type needed, business verification, domain verification, privacy policy / ToS URLs, demo video, etc.
3. Ordered setup steps: what exactly do you click/fill in, and at which steps does the developer need to log in, accept legal terms, prove identity, or pay -- versus steps an automation agent could fill in for them.
4. Scopes and tiers: which OAuth scopes trigger manual review, and any test-user or rate limits that apply before full approval.
5. Blockers: common rejection reasons and known workarounds (e.g. a "testing" or "development" mode that works without approval).
6. Realistic time estimates: time to get a first working test connection, and realistic time to production approval including any waiting on a review queue.

Be concrete and cite what you can. If something is genuinely unclear or you found conflicting information, say so explicitly rather than guessing -- the next step in this pipeline will downgrade any unsupported claim to "uncertain," so do not state something as fact if you aren't sure.`,
    })
  );

  const sources: ResearchSource[] = (result.sources ?? [])
    .filter((s): s is Extract<typeof s, { sourceType: "url" }> => s.sourceType === "url")
    .map((s) => ({ url: s.url, title: s.title }));

  if (resolved.providerDocsUrl && officialDocsText) {
    sources.unshift({ url: resolved.providerDocsUrl, title: "Official docs" });
  }

  return { narrative: result.text, sources };
}
