import type { Metadata } from "next";
import { ProShell } from "@/app/pro/ProShell";
import ProDashboard from "./ProDashboard";

export const metadata: Metadata = {
  title: "Pro ダッシュボード | Aster Support Navi",
  robots: { index: false, follow: false },
};

export default function ProDashboardPage() {
  return (
    <ProShell>
      <ProDashboard />
    </ProShell>
  );
}
