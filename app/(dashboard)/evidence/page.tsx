import { getGuideBySlug } from "@/lib/db/queries";
import { GuideSchema } from "@/lib/schema/guide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { evidenceComparisons } from "@/data/evidence-findings";

// Reads live DB state -- never prerender at build time.
export const dynamic = "force-dynamic";

const CATEGORY_LABEL = { correct: "Got right", wrong: "Got wrong", missing: "Missed" } as const;
const CATEGORY_BADGE_CLASS = {
  correct: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  wrong: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  missing: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
} as const;

function tally(findings: { category: keyof typeof CATEGORY_LABEL }[]) {
  return {
    correct: findings.filter((f) => f.category === "correct").length,
    wrong: findings.filter((f) => f.category === "wrong").length,
    missing: findings.filter((f) => f.category === "missing").length,
  };
}

async function Comparison({ slug, appName, findings }: { slug: string; appName: string; findings: { category: keyof typeof CATEGORY_LABEL; note: string }[] }) {
  const [handcrafted, generated] = await Promise.all([
    getGuideBySlug(slug),
    getGuideBySlug(`${slug}-generated`),
  ]);

  const handcraftedGuide = handcrafted ? GuideSchema.safeParse(handcrafted.guideJson) : null;
  const generatedGuide = generated ? GuideSchema.safeParse(generated.guideJson) : null;
  const counts = tally(findings);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{appName}</CardTitle>
        {findings.length > 0 && (
          <div className="flex gap-2">
            <Badge variant="outline" className={CATEGORY_BADGE_CLASS.correct}>{counts.correct} right</Badge>
            <Badge variant="outline" className={CATEGORY_BADGE_CLASS.wrong}>{counts.wrong} wrong</Badge>
            <Badge variant="outline" className={CATEGORY_BADGE_CLASS.missing}>{counts.missing} missed</Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
          <div>
            <div className="font-medium">Verified (handcrafted)</div>
            {handcraftedGuide?.success ? (
              <p className="text-muted-foreground">{handcraftedGuide.data.verdict.summary}</p>
            ) : (
              <p className="text-muted-foreground italic">Not seeded yet.</p>
            )}
          </div>
          <div>
            <div className="font-medium">Agent-generated</div>
            {generatedGuide?.success ? (
              <p className="text-muted-foreground">{generatedGuide.data.verdict.summary}</p>
            ) : (
              <p className="text-muted-foreground italic">
                Not yet generated -- run the live pipeline for &quot;{slug}&quot; with slugOverride &quot;{slug}-generated&quot;.
              </p>
            )}
          </div>
        </div>

        {findings.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {findings.map((f, i) => (
              <li key={i} className="flex gap-2">
                <Badge variant="outline" className={CATEGORY_BADGE_CLASS[f.category]}>
                  {CATEGORY_LABEL[f.category]}
                </Badge>
                <span>{f.note}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Comparison notes not filled in yet -- see data/evidence-findings.ts.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function EvidencePage() {
  const all = evidenceComparisons.flatMap((c) => c.findings);
  const totals = tally(all);

  return (
    <div className="max-w-3xl space-y-6 px-8 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Evidence &amp; Verification</h1>
        <p className="text-muted-foreground">
          A small, honest self-check: we ran the live agent on all four apps already in the library, which
          we&apos;d separately hand-researched and source-checked (GitHub: no gate; Notion: optional gallery
          review; Spotify: a hard user quota; Google: full verification + security assessment), and diffed what
          it produced, claim by claim, against the verified guide -- against live docs, not a cherry-picked or
          edited run. The pipeline now includes a deterministic tier-consistency check (it scans a guide&apos;s
          own generated steps/blockers for gate signals and corrects the headline difficulty tier if it
          contradicts them) and a research query aimed specifically at caps, quotas, and eligibility rules, on
          top of the original research/draft/critic pipeline -- both added directly in response to failures this
          page caught.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Key takeaways</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-2">
            <Badge variant="outline" className={CATEGORY_BADGE_CLASS.correct}>{totals.correct} right</Badge>
            <Badge variant="outline" className={CATEGORY_BADGE_CLASS.wrong}>{totals.wrong} wrong</Badge>
            <Badge variant="outline" className={CATEGORY_BADGE_CLASS.missing}>{totals.missing} missed</Badge>
            <span className="text-muted-foreground">across 4 apps, {all.length} findings total</span>
          </div>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">
                Difficulty-tier accuracy is now the pipeline&apos;s strongest point, not its weakest.
              </strong>{" "}
              All three apps that previously had a wrong headline tier -- Google (<code>self_serve</code> despite
              describing its own multi-week review), Spotify (<code>light_review</code> despite a hard user
              quota), and Notion (<code>self_serve</code> despite an Integration Gallery wait) -- now correctly
              flag that a real gate exists. Google and Spotify land exactly on <code>heavy_review</code>, matching
              the handcrafted guides. Notion overshoots to <code>heavy_review</code> where <code>light_review</code>{" "}
              is the more accurate answer -- a few days of marketplace review is milder than Google&apos;s
              multi-week security assessment -- but correctly signaling a wait exists beats confidently claiming
              there is none.
            </li>
            <li>
              <strong className="text-foreground">
                Fixing &quot;is there a gate&quot; doesn&apos;t fix &quot;what exactly is the gate&quot;.
              </strong>{" "}
              Spotify&apos;s guide now surfaces the real eligibility bar for Extended Quota Mode -- a 250,000-MAU
              minimum, geographic availability, a registered legal entity -- but still never states the single
              most load-bearing number in the whole guide: that Development Mode caps a new app at 5 real
              authorized users. Getting the tier right and getting the specific number right turned out to be two
              separate problems with two different causes.
            </li>
            <li>
              <strong className="text-foreground">
                Chasing one fix surfaced a new, different failure mode.
              </strong>{" "}
              Re-running Notion landed the resolve step on an official-looking but unrelated page --
              developers.notion.com&apos;s docs for its own &quot;Workers&quot; automation platform, not the
              public-integration OAuth flow a developer actually needs -- which then contaminated two of the
              generated guide&apos;s three steps with irrelevant content. A single generic search query can pick
              the wrong specific page when a provider&apos;s domain hosts multiple, differently-named products
              that all mention &quot;OAuth&quot;.
            </li>
            <li>
              <strong className="text-foreground">Source presence still isn&apos;t source relevance.</strong> The
              Critic step checks that a cited URL came back from the actual search results, but not that the
              URL&apos;s content actually supports that specific claim. GitHub&apos;s hallucinated source (an
              unrelated blog cited as evidence for a token-exchange claim) and Google&apos;s source-reuse pattern
              (one generic landing page cited for six unrelated prerequisites) are both still present -- this
              specific gap hasn&apos;t been addressed yet.
            </li>
            <li>
              <strong className="text-foreground">The agent isn&apos;t uniformly worse than the handcrafted guide.</strong>{" "}
              It consistently uses REPORTED rather than DOCUMENTED for forum/community-sourced claims (Spotify&apos;s
              MAU minimum and legal-entity requirement, sourced from a Spotify Community thread) -- good evidence
              discipline the handcrafted guides don&apos;t even have occasion to exercise. The remaining failures
              cluster in judgment calls -- which specific fact is load-bearing, which page is actually the right
              one -- rather than in raw research effort.
            </li>
          </ul>
        </CardContent>
      </Card>

      {evidenceComparisons.map((c) => (
        <Comparison key={c.slug} {...c} />
      ))}
    </div>
  );
}
