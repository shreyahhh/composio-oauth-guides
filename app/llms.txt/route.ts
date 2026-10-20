import { listGuides } from "@/lib/db/queries";
import { GuideSchema } from "@/lib/schema/guide";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const rows = await listGuides();

  const lines: string[] = [
    "# OAuth Setup Guides",
    "",
    "> Guides for developers registering and getting approved for an OAuth app",
    "> with a provider (Gmail, Slack, LinkedIn, ...) so their own app's users",
    "> can connect their accounts. Each guide has a verdict, ordered setup",
    "> steps tagged by who can do them, and every claim labeled with its",
    "> evidence level (TESTED / DOCUMENTED / REPORTED / UNCERTAIN).",
    "",
  ];

  for (const row of rows) {
    const parsed = GuideSchema.safeParse(row.guideJson);
    if (!parsed.success) continue;
    const g = parsed.data;
    lines.push(
      `- [${g.appName}](${origin}/guides/${g.slug}): ${g.verdict.summary} ([Markdown](${origin}/guides/${g.slug}/markdown))`
    );
  }

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
