import { notFound } from "next/navigation";
import { getGuideBySlug } from "@/lib/db/queries";
import { GuideSchema } from "@/lib/schema/guide";
import { GuideView } from "@/components/guide/guide-view";

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getGuideBySlug(slug);
  if (!row) notFound();

  const guide = GuideSchema.parse(row.guideJson);
  return <GuideView guide={guide} />;
}
