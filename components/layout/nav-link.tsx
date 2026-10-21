"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// `icon` takes a rendered element (e.g. <Library className="..." />), not a
// component reference -- a Server Component (Sidebar) can't pass a raw
// component/function type as a prop into a Client Component across the RSC
// boundary, but it CAN pass already-rendered JSX it produced.
export function NavLink({
  href,
  children,
  icon,
  exact = false,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  exact?: boolean;
  external?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </Link>
  );
}
