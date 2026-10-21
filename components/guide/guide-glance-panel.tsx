import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DifficultyBadge } from "./badges";
import type { Guide } from "@/lib/schema/guide";

export function GuideGlancePanel({ guide }: { guide: Guide }) {
  const { verdict, evidenceSummary } = guide;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">At a glance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Difficulty</span>
            <DifficultyBadge tier={verdict.difficultyTier} />
          </div>
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground">Time to set up (first test connection)</div>
            <div className="text-sm font-medium">{verdict.timeToFirstTestConnection}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Time to get verified (production approval)</div>
            <div className="text-sm font-medium">{verdict.timeToProductionApproval}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evidence</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Tested</div>
            <div className="font-medium">{evidenceSummary.testedCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Documented</div>
            <div className="font-medium">{evidenceSummary.documentedCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Reported</div>
            <div className="font-medium">{evidenceSummary.reportedCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Uncertain</div>
            <div className="font-medium">{evidenceSummary.uncertainCount}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
