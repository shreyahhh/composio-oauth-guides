"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NavLink } from "./nav-link";
import type { Guide } from "@/lib/schema/guide";

function GuideList({ guides }: { guides: Guide[] }) {
  if (guides.length === 0) {
    return <p className="px-2.5 py-2 text-xs text-sidebar-foreground/50">None yet.</p>;
  }
  return (
    <div className="space-y-0.5">
      {guides.map((g) => (
        <NavLink key={g.slug} href={`/guides/${g.slug}`}>
          {g.appName}
        </NavLink>
      ))}
    </div>
  );
}

export function GuideTabs({ verified, generated }: { verified: Guide[]; generated: Guide[] }) {
  if (verified.length === 0 && generated.length === 0) return null;

  return (
    <div className="pt-4">
      <div className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-foreground/50 uppercase">
        Guides
      </div>
      <Tabs defaultValue={verified.length > 0 ? "verified" : "generated"} className="px-2.5">
        <TabsList className="w-full bg-sidebar-accent">
          <TabsTrigger
            value="verified"
            className="data-active:bg-sidebar data-active:text-sidebar-foreground dark:data-active:bg-sidebar dark:data-active:text-sidebar-foreground"
          >
            Verified
            <span className="text-sidebar-foreground/40">{verified.length}</span>
          </TabsTrigger>
          <TabsTrigger
            value="generated"
            className="data-active:bg-sidebar data-active:text-sidebar-foreground dark:data-active:bg-sidebar dark:data-active:text-sidebar-foreground"
          >
            Generated
            <span className="text-sidebar-foreground/40">{generated.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="verified" className="mt-2">
          <GuideList guides={verified} />
        </TabsContent>
        <TabsContent value="generated" className="mt-2">
          <GuideList guides={generated} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
