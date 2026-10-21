# AuthPilot

A developer building an AI agent doesn't actually want to know "how does
OAuth work" -- they want to know **how long until I can launch, and what
will block me?** when they need to register their own OAuth app with a
provider (Gmail, Slack, LinkedIn, ...) before their users can connect it.

AuthPilot is a small, working tool for that: a library of verdict-first
guides, a live agent pipeline that investigates and writes a new guide for
any app in real time, and an honest evidence trail on every claim it makes.

- **Live app:** https://oauth-guides-omega.vercel.app/ -- a simple landing
  page at `/`; the dashboard (library + live generation) lives at `/dashboard`
- **Evidence & Verification:** `/evidence`
- **Agent-readable index:** `/llms.txt`

## What's here

- **A guide library** (`data/guides/`): GitHub, Notion, Spotify, and Google,
  deliberately chosen to contrast four different kinds of friction --
  no gate, a review queue, a hard user quota, and a verification +
  security-assessment wall. Every claim in these is backed by a citation to
  the provider's own docs (fetched directly), researched by this agent --
  **not hands-on tested**. See "Limitations" below for exactly what that
  means and what you should test yourself before relying on it.
- **A live generation pipeline** (`lib/pipeline/`): submit any app name or
  URL and watch it resolve the provider, research it (real Tavily web search +
  reading the official docs directly), check Composio for a managed-auth
  shortcut, draft a guide against a shared schema, and critique its own
  claims before saving -- all streamed step by step.
- **Evidence labeling** on every material claim: `TESTED` / `DOCUMENTED` /
  `REPORTED` / `UNCERTAIN`, each with a source link and a last-checked date
  (schema in `lib/schema/guide.ts`).
- **A Playwright setup-attempt script** (`scripts/playwright-setup-attempt.ts`)
  that drives GitHub's real OAuth App creation form up to the point a human
  must log in, log in and continue -- it never sees or stores credentials.

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Environment variables** -- copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` -- a Neon Postgres connection string (free tier; see
     the Neon console -> your project -> "Connect")
   - `GROQ_API_KEY` -- from [console.groq.com/keys](https://console.groq.com/keys)
     (free tier, rate-limited not credit-limited, no card ever required)
   - `TAVILY_API_KEY` -- from [app.tavily.com](https://app.tavily.com) (free
     tier: 1,000 search credits/month, no card required)
   - `COMPOSIO_API_KEY` -- from [app.composio.dev](https://app.composio.dev)
     (free plan). **Switch the dashboard to "Platform" mode first** (not
     "For You"), then Settings -> Project Settings -> API Keys -- the "For
     You" mode's key is an MCP consumer key and won't authenticate the SDK.
   - `GROQ_MODEL` -- optional, defaults to `openai/gpt-oss-120b` (see
     "Key decisions" below for why)

   **Never commit `.env.local`.** Only `.env.example` (with empty values) is
   tracked.

3. **Push the DB schema and seed the handcrafted library**
   ```bash
   npm run db:push
   npm run seed
   ```
   The seed script writes the four handcrafted guides and checks Composio's
   managed-auth status for each live, via the SDK -- it isn't hardcoded.

4. **Run it**
   ```bash
   npm run dev
   ```

5. **Deploy** -- push to GitHub, import into Vercel (Hobby plan is enough),
   set the same four env vars there, and it's live. No paid plan or credit
   card required anywhere in this stack.

6. **(Optional) Generate the Evidence & Verification comparisons**
   ```bash
   npm run evidence:generate
   ```
   This runs the live pipeline against "GitHub" and "Google" into
   `github-generated` / `google-generated` rows, so `/evidence` can compare
   them to the verified handcrafted guides. Fill in
   `data/evidence-findings.ts` with what you observe afterward.

7. **(Optional) Run the GitHub setup-attempt script**
   ```bash
   npm run setup-attempt:github
   ```
   Opens a real browser window, drives GitHub's new-OAuth-App form up to
   the login wall, waits for you to log in by hand, then screenshots the
   form fields. **Review the screenshots in `evidence/github/` before
   committing** -- the GitHub nav bar will show your real username/avatar.

## Key decisions

- **Groq + Tavily, not Gemini, despite the original plan.** Gemini was the
  original choice, and the code path was built and working end-to-end
  against it. In practice, a fresh Google AI Studio key hit "Your
  prepayment credits are depleted" on its very first call -- a
  well-documented 2025/2026 issue where Google AI Studio now requires an
  actual prepay wallet deposit to "activate" the free tier, not just a
  linked payment method. That's a real cost/friction the assignment
  explicitly rules out ("everything must be free, no paid plans, no credit
  card"), so the LLM layer was switched to **Groq** (free tier is
  rate-limited, not credit-limited -- no card requirement at any point,
  confirmed on their own pricing docs) and web search was switched to
  **Tavily** (free tier: 1,000 credits/month, no card, purpose-built for
  exactly this "give an LLM real search results" use case). This is the
  single biggest deviation from the plan as originally approved, and it's
  the kind of thing "verify current facts before finalizing" is meant to
  catch -- a provider's documented free tier and its actual day-one
  behavior aren't always the same thing.
- **Grounding is manual (Tavily results in the prompt), not a provider
  tool.** Groq's own built-in browser-search tool exists but is a paid
  add-on (and even its "currently free during beta" variant is only
  free-with-an-asterisk and restricted to two specific models) -- not a
  stable free-tier guarantee worth building on. Instead, Resolve and
  Research each run a real Tavily search first, then hand the model the
  actual result URLs and snippets and forbid it from citing anything not
  in that list. This also means the source list Draft/Critic check claims
  against comes from Tavily directly, not from the model's self-report --
  arguably more reliable than a provider's own grounding-metadata.
- **Research and Draft are still separate LLM calls**, now for a cleaner
  reason: Research needs the search results in its prompt (plain text),
  while Draft needs structured output -- keeping them separate keeps each
  prompt focused, independent of whether a given provider can combine the
  two.
- **A dedicated Critic pass**, not just prompting Draft to "be careful."
  It's a second structured-output call that checks every claim against the
  actual list of source URLs collected during Research and downgrades
  anything unsupported to `UNCERTAIN` before the guide is ever saved. This
  is the guardrail against a confident-but-fabricated guide.
- **UNCERTAIN isn't the final answer -- it's a prompt to try harder, within
  limits.** Before accepting a claim as UNCERTAIN, the Critic step runs up
  to 3 additional, differently-worded Tavily searches for it (capped at 3
  claims per guide, to bound search-API usage and runtime): the Draft
  step's source list might just be incomplete for that one claim, not the
  claim itself being unverifiable. A recovered source is labeled
  `DOCUMENTED` if it looks like an official docs domain or `REPORTED`
  otherwise. Verified live: generating a guide for Trello recovered real
  sources for 2 claims that would otherwise have shipped as UNCERTAIN.
- **`openai/gpt-oss-120b`, not a Gemini model.** Groq's catalog turns over
  fast enough that the first model chosen here (`llama-3.3-70b-versatile`)
  was already retired by the time of testing -- confirmed by querying
  `GET https://api.groq.com/openai/v1/models` directly rather than trusting
  stale docs. Override via `GROQ_MODEL`; re-check that models endpoint or
  console.groq.com/docs/models for current options and per-model rate
  limits before relying on this default.
- **`GuideSchema` uses `z.nullable()`, not `z.optional()`, throughout.**
  Groq's strict structured-output mode (`providerOptions: { groq: {
  structuredOutputs: true } }`, used on the Draft call) is like OpenAI's:
  it rejects Zod's `.url()` format keyword outright, and separately
  requires every property to be listed in the JSON schema's `required`
  array -- which rules out `.optional()` for any field the model fills in.
  Reworking every optional field (sourceUrl, estimatedMinutes, workaround,
  a step's evidence, appUrl, providerDocsUrl, developerPortalUrl,
  pipelineVersion, and the ManagedAuthStatus fields) as nullable instead
  was the actual fix, not a workaround around it -- `null` is the
  schema's honest "not applicable / unknown" value everywhere a field
  isn't filled in, including in the handcrafted guide data files.
- **Composio's managed-auth check is a live SDK call, not a guess.** Both
  the seed script and the live pipeline call
  `composio.toolkits.get(slug)` and read `composioManagedAuthSchemes`,
  surfacing the specific auth scheme rather than a bare yes/no -- a toolkit
  can have multiple auth methods with mixed managed status, per Composio's
  own managed-auth docs.
- **Cache Components (Next.js 16's new PPR model) is turned off.** Every
  page here reflects live DB state (a guide can be generated at any
  moment), so there's no static-shell benefit worth the `use cache` /
  `<Suspense>` restructuring it requires. Plain dynamic rendering is simpler
  and correct for this app.
- **Drizzle + Neon's HTTP driver (`neon-http`)**, not a persistent
  connection pool -- matches Neon's serverless/autosuspend model and works
  cleanly from Vercel's serverless functions.
- **Playwright runs locally only, and only for GitHub.** Portal UIs are too
  heterogeneous and brittle to script reliably for every provider in the
  time available; one real example proves the "agent attempts setup"
  concept. It's a dev-only script (`scripts/`), never deployed, and stops
  at every login/legal/identity boundary -- it never sees or stores
  credentials.
- **Research prompts are capped at ~4,000 characters (docs text and
  narrative alike), and `maxRetries: 0` is set on every LLM call.** Found
  by testing, not assumption: Groq's free tier enforces an 8,000
  tokens/minute budget, and the Research step's narrative was being echoed
  back in full into the Draft prompt -- a single Draft call could use
  4,000-7,000 tokens, leaving almost no headroom and triggering 429s that
  a naive 1-4s exponential backoff couldn't recover from (a per-minute
  budget needs tens of seconds to reset, not seconds). `maxRetries: 0`
  stops the AI SDK's own internal retry from masking the real
  `x-ratelimit-reset-tokens` value our own `withBackoff` (`lib/ai/retry.ts`)
  needs to wait the correct amount of time.

## Limitations

- **The handcrafted guides are researched, not hands-on tested, by this
  agent.** Every claim in `data/guides/*.ts` cites a provider doc fetched
  directly and is labeled `DOCUMENTED` or `REPORTED` -- never `TESTED`,
  because that would mean claiming hands-on verification that didn't
  happen. Each file has a comment pointing at exactly which steps you
  should walk through yourself (creating the OAuth app, generating a
  secret, running the authorization flow) and upgrade to `TESTED` once you
  have.
- **Free-tier numbers that could not be verified with confidence** (flagged
  rather than guessed):
  - Exact Groq per-model RPM/RPD/TPM -- these vary by model and change
    often; check console.groq.com/docs/rate-limits for your account's
    current numbers before relying on one.
  - Neon's cold-start latency after its 5-minute autosuspend (not
    officially documented; commonly reported, not confirmed, as fast).
  - Whether a long-idle free Neon project risks archival -- not addressed
    in the docs found; worth checking the Neon dashboard before a review
    call happening weeks after you stop actively using the project.
- **Composio's `composioManagedAuthSchemes` is toolkit-level.** When a
  toolkit supports multiple auth schemes with mixed managed status, the
  guide surfaces the specific scheme(s) Composio manages, but a developer
  should still open the toolkit's own Composio page to confirm for their
  exact use case.
- **A single same-input cache check, not true dedup.** `/api/generate`
  short-circuits on an exact repeat of the same input string, but a
  differently-worded input for the same provider (e.g. "gmail" vs. "Google
  Mail") can still re-run the pipeline -- it will update the same resolved
  slug's row rather than creating a duplicate, but won't short-circuit on
  the first pass.

## Evidence summary

See `/evidence` for the full claim-by-claim comparison, run via the live
pipeline against all four library apps (GitHub, Notion, Spotify, Google) and
diffed against the hand-verified guides. The pipeline includes three targeted
fixes built directly from earlier failures this page caught: a deterministic
check that scans a drafted guide's own steps/blockers for gate signals and
corrects the headline difficulty tier if it contradicts them; a research
query aimed specifically at caps, quotas, and eligibility rules rather than
general review-process language; and a Critic that judges a cited source
against its actual content/snippet (not a bare URL) and, when recovering an
otherwise-unsupported claim via a fresh search, requires the candidate result
to actually mention the app by name before accepting it.

Difficulty-tier accuracy is now the strongest part of the pipeline: Google,
Spotify, and Notion all previously had a wrong headline tier, and all three
now correctly flag that a real gate exists. Google and Spotify land exactly
on `heavy_review`, matching the handcrafted guides; Notion overshoots to
`heavy_review` where `light_review` is more accurate, but that's a safer
error than the original self_serve. Getting the tier right doesn't mean
getting every specific right, though -- Spotify's guide now surfaces its
real eligibility bar (a 250,000-MAU minimum, geographic availability, a
registered legal entity) but still never states the single most load-bearing
number in the guide: that Development Mode caps a new app at 5 real
authorized users. And chasing the Notion fix surfaced a new failure mode:
a re-run landed the resolve step on an official-looking but unrelated page
(Notion's own "Workers" automation platform's OAuth docs, not the
public-integration flow a developer needs), which then contaminated two of
the three generated setup steps with irrelevant content -- a single generic
search query can pick the wrong specific page when a provider's domain hosts
multiple, differently-named products that all mention "OAuth."

The source-relevance fix closed its specific target but not the general
problem: re-running GitHub confirmed the Norwegian-BankID-blog-cited-for-a-
GitHub-claim hallucination is gone -- the recovery path now requires a
candidate source to actually mention "GitHub" before accepting it, and an
off-topic page from an unrelated provider essentially never does. But the
same re-run also showed the fix's limit: one recovered claim now cites
Automattic's own privacy-policy template (hosted on github.com, so it passes
the app-name check) as evidence GitHub doesn't require a privacy policy for
OAuth apps -- it mentions "GitHub" without actually being authoritative on
that specific point. Mentioning the right app isn't the same as being right
about the specific claim; that needs real content-relevance judgment, which
is a deeper fix than a keyword check. (Google's source-reuse pattern -- one
generic landing page cited for six unrelated prerequisites -- wasn't
re-tested against the updated Critic and may or may not still occur.) Not
uniformly worse, though: the agent consistently labels forum/community-
sourced claims REPORTED rather than DOCUMENTED, which is good evidence
discipline the handcrafted guides don't even have occasion to exercise. Net
takeaway: the remaining failures cluster in judgment calls -- which specific
fact is load-bearing, which page is actually the right one, whether a source
is merely on-topic versus actually authoritative -- rather than in raw
research effort.

## What's next

- **Scale to the full 100-app vision**: the schema and pipeline don't
  change -- it's purely a matter of running more handcrafted research
  passes and letting the live pipeline backfill the long tail on demand.
- **Scheduled re-verification and change detection**: re-run Research
  periodically for library guides and diff against the saved claims,
  flagging ones whose source page has changed since `lastChecked`.
- **Community corrections**: let developers who actually complete setup
  submit a correction to a specific claim, with their own evidence --
  turning every real attempt into a source for the next developer.
- **Finer-grained Composio checks**: surface per-scope (not just
  per-toolkit) managed-auth status where Composio's API supports it.
- **More Playwright setup-attempt providers**: GitHub proves the concept;
  Notion and Spotify's dashboards look similarly scriptable up to their
  own login walls.

## No credentials, ever

`.env.local` is gitignored; only `.env.example` (empty values) is tracked.
The Playwright script never receives, stores, or transmits a password, 2FA
code, or API key -- it waits for you to complete every authenticated step
by hand in the browser window it opens. No paid account or completed
provider approval was required to build or run any part of this.
