import { listGuides } from "@/lib/db/queries";
import { GuideSchema } from "@/lib/schema/guide";
import { GenerateForm } from "@/components/guide/generate-form";
import { GuideCard } from "@/components/guide/guide-card";
import { StatsPanel } from "@/components/guide/stats-panel";

// Always reflects live DB state (guides can be generated at any moment) --
// never prerender this at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await listGuides();
  const guides = rows
    .map((r) => GuideSchema.safeParse(r.guideJson))
    .filter((r) => r.success)
    .map((r) => r.data);

  return (
    <div className="max-w-7xl px-8 py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">OAuth Setup Guides</h1>
            <p className="max-w-2xl text-muted-foreground">
              The real question when you need to let your AI agent&apos;s users connect an app isn&apos;t &quot;how
              does OAuth work&quot; -- it&apos;s how long until you can launch, and what will block you. Every guide
              below leads with a verdict, then the details, with every claim labeled by how well it&apos;s
              supported.
            </p>
          </header>

          <section id="generate" className="space-y-3 scroll-mt-6">
            <h2 className="text-lg font-medium">Generate a guide for any app</h2>
            <GenerateForm />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Library</h2>
            {guides.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No guides yet -- generate one above, or run the seed script.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {guides.map((g) => (
                  <GuideCard key={g.slug} guide={g} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-10 lg:self-start">
          <StatsPanel guides={guides} />
        </aside>
      </div>
    </div>
  );
}
