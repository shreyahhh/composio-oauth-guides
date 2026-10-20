import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "./badges";
import type { Guide } from "@/lib/schema/guide";

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link href={`/guides/${guide.slug}`}>
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{guide.appName}</CardTitle>
            <Badge variant={guide.source === "handcrafted" ? "secondary" : "outline"} className="shrink-0">
              {guide.source === "handcrafted" ? "Verified" : "Generated"}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">{guide.verdict.summary}</CardDescription>
        </CardHeader>
        <CardContent>
          <DifficultyBadge tier={guide.verdict.difficultyTier} />
        </CardContent>
      </Card>
    </Link>
  );
}
