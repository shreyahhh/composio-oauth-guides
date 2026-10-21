import { getGuideBySlug } from "@/lib/db/queries";
import { GuideSchema } from "@/lib/schema/guide";
import { guideToMarkdown } from "@/lib/markdown";

export async function GET(_request: Request, ctx: RouteContext<"/guides/[slug]/markdown">) {
  const { slug } = await ctx.params;
  const row = await getGuideBySlug(slug);
  if (!row) return new Response("Not found", { status: 404 });

  const guide = GuideSchema.parse(row.guideJson);
  return new Response(guideToMarkdown(guide), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
