import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DifficultyBadge } from "./badges";
import type { Guide, DifficultyTier } from "@/lib/schema/guide";

const TIER_ORDER: DifficultyTier[] = ["self_serve", "light_review", "heavy_review", "gated_partner"];

export function StatsPanel({ guides }: { guides: Guide[] }) {
  if (guides.length === 0) return null;

  const verifiedCount = guides.filter((g) => g.source === "handcrafted").length;
  const generatedCount = guides.filter((g) => g.source === "generated").length;

  const tierCounts = TIER_ORDER.reduce(
    (acc, tier) => {
      acc[tier] = guides.filter((g) => g.verdict.difficultyTier === tier).length;
      return acc;
    },
    {} as Record<DifficultyTier, number>
  );

  const evidenceTotals = guides.reduce(
    (acc, g) => {
      acc.tested += g.evidenceSummary.testedCount;
      acc.documented += g.evidenceSummary.documentedCount;
      acc.reported += g.evidenceSummary.reportedCount;
      acc.uncertain += g.evidenceSummary.uncertainCount;
      return acc;
    },
    { tested: 0, documented: 0, reported: 0, uncertain: 0 }
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Library at a glance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total guides</span>
            <span className="font-medium">{guides.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Verified / Generated</span>
            <span className="font-medium">
              {verifiedCount} / {generatedCount}
            </span>
          </div>
          <div className="space-y-1.5 border-t pt-3">
            {TIER_ORDER.filter((t) => tierCounts[t] > 0).map((tier) => (
              <div key={tier} className="flex items-center justify-between">
                <DifficultyBadge tier={tier} />
                <span className="text-sm text-muted-foreground">{tierCounts[tier]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evidence across the library</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Tested</div>
            <div className="font-medium">{evidenceTotals.tested}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Documented</div>
            <div className="font-medium">{evidenceTotals.documented}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Reported</div>
            <div className="font-medium">{evidenceTotals.reported}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Uncertain</div>
            <div className="font-medium">{evidenceTotals.uncertain}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
