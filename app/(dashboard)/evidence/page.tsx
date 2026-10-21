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
          it produced, claim by claim, against the verified guide. Run on 2026-10-21 against live docs --
          not a cherry-picked or edited run.
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
                The agent consistently misses the specific gate, cap, or eligibility rule that makes a provider
                hard -- the exact thing a developer most needs to know.
              </strong>{" "}
              It missed Spotify&apos;s 5-user Development Mode cap entirely, and separately missed that Extended
              Quota Mode has been organization-only since May 2025. (Spotify&apos;s quota numbers are demonstrably
              easy to get wrong even with care: the handcrafted guide&apos;s own file comment records a different
              correction on this same app -- an earlier pass assumed a 25-user cap before the actual 5-user figure
              was confirmed.) It also missed Notion&apos;s Integration Gallery review window, and mislabeled
              Google&apos;s overall difficulty as self-serve despite generating its own step describing a
              multi-week review. The agent is reliably good at the mechanical &quot;how do I click through this&quot;
              steps and reliably weak at surfacing the one eligibility rule or quota that actually gates launch --
              which is precisely the &quot;requirements and nuances that could affect setup&quot; the brief asks
              guides to surface. This is the strongest argument for keeping the handcrafted library as the trusted
              baseline rather than treating live-generated guides as equivalent.
            </li>
            <li>
              <strong className="text-foreground">Source presence isn&apos;t source relevance.</strong> The
              Critic step checks that a cited URL came back from the actual search results, but not that the
              URL&apos;s content actually supports that specific claim. That let an unrelated blog post get cited
              as evidence for a GitHub token-exchange claim, let one generic Google landing page get reused as the
              source for six unrelated setup steps, and let a third-party blog outrank Notion&apos;s own docs for
              the core OAuth-flow claims. All of these passed the automated check; none should have counted as
              strong evidence for the specific claim attached to it.
            </li>
            <li>
              <strong className="text-foreground">A guide&apos;s own body can contradict its headline verdict.</strong>{" "}
              The generated Google guide labeled itself <code>self_serve</code> while also generating a step
              called &quot;Await Google review&quot; with a multi-week estimate -- the single field a developer
              scans first (difficulty tier) was wrong even though the underlying steps were largely right.
            </li>
            <li>
              <strong className="text-foreground">The agent isn&apos;t uniformly worse than the handcrafted guide.</strong>{" "}
              Its Google step-by-step breakdown was more granular and arguably more actionable than the hand-written
              version, and it correctly used REPORTED (not DOCUMENTED) for a Spotify forum-sourced claim the
              handcrafted guide doesn&apos;t even mention. The failures cluster in judgment calls -- which facts
              are load-bearing, which sources are authoritative -- rather than in raw research effort, which argues
              for keeping a human/Critic check on the summary fields and the &quot;what&apos;s the hardest part&quot;
              judgment specifically, not for distrusting the pipeline wholesale.
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
