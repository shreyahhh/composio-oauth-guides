import { getGuideBySlug } from "@/lib/db/queries";
import { GuideSchema } from "@/lib/schema/guide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { evidenceComparisons } from "@/data/evidence-findings";

// Reads live DB state -- never prerender at build time.
export const dynamic = "force-dynamic";

const CATEGORY_LABEL = { correct: "Got right", wrong: "Got wrong", missing: "Missed" } as const;

async function Comparison({ slug, appName, findings }: { slug: string; appName: string; findings: { category: keyof typeof CATEGORY_LABEL; note: string }[] }) {
  const [handcrafted, generated] = await Promise.all([
    getGuideBySlug(slug),
    getGuideBySlug(`${slug}-generated`),
  ]);

  const handcraftedGuide = handcrafted ? GuideSchema.safeParse(handcrafted.guideJson) : null;
  const generatedGuide = generated ? GuideSchema.safeParse(generated.guideJson) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{appName}</CardTitle>
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
                <Badge
                  variant="outline"
                  className={
                    f.category === "correct"
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                      : f.category === "wrong"
                        ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200"
                        : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                  }
                >
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
  return (
    <div className="max-w-3xl space-y-6 px-8 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Evidence &amp; Verification</h1>
        <p className="text-muted-foreground">
          A small, honest self-check: we ran the live agent on two apps we&apos;d already hand-tested and verified
          (GitHub, chosen as the easy contrast case; Google, chosen as the hard one), and compared what it produced
          against the verified guide.
        </p>
      </header>
      {evidenceComparisons.map((c) => (
        <Comparison key={c.slug} {...c} />
      ))}
    </div>
  );
}
