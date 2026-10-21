import Link from "next/link";
import { Library, Sparkles, ShieldCheck, FileCode } from "lucide-react";
import { listGuides } from "@/lib/db/queries";
import { GuideSchema } from "@/lib/schema/guide";
import { NavLink } from "./nav-link";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-foreground/50 uppercase">{children}</div>;
}

export async function Sidebar() {
  const rows = await listGuides();
  const guides = rows.map((r) => GuideSchema.safeParse(r.guideJson)).filter((r) => r.success).map((r) => r.data);
  const verified = guides.filter((g) => g.source === "handcrafted");
  const generated = guides.filter((g) => g.source === "generated");

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <Link href="/dashboard" className="flex items-center gap-2 px-4 py-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <ShieldCheck className="size-4" />
        </div>
        <span className="font-semibold">AuthPilot</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <SectionLabel>Get started</SectionLabel>
        <div className="space-y-0.5">
          <NavLink href="/dashboard" icon={<Library className="size-4 shrink-0" />} exact>
            Library
          </NavLink>
          <NavLink href="/dashboard#generate" icon={<Sparkles className="size-4 shrink-0" />}>
            Generate a guide
          </NavLink>
          <NavLink href="/evidence" icon={<ShieldCheck className="size-4 shrink-0" />}>
            Evidence &amp; Verification
          </NavLink>
          <NavLink href="/llms.txt" icon={<FileCode className="size-4 shrink-0" />} external>
            llms.txt
          </NavLink>
        </div>

        {verified.length > 0 && (
          <>
            <SectionLabel>Verified guides</SectionLabel>
            <div className="space-y-0.5">
              {verified.map((g) => (
                <NavLink key={g.slug} href={`/guides/${g.slug}`}>
                  {g.appName}
                </NavLink>
              ))}
            </div>
          </>
        )}

        {generated.length > 0 && (
          <>
            <SectionLabel>Generated</SectionLabel>
            <div className="space-y-0.5">
              {generated.map((g) => (
                <NavLink key={g.slug} href={`/guides/${g.slug}`}>
                  {g.appName}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/60">
        {guides.length} guide{guides.length === 1 ? "" : "s"}
      </div>
    </aside>
  );
}
