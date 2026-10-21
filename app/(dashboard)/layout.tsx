import { Sidebar } from "@/components/layout/sidebar";
import { DashboardMain } from "@/components/layout/dashboard-main";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-row">
      <Sidebar />
      <DashboardMain>{children}</DashboardMain>
    </div>
  );
}
