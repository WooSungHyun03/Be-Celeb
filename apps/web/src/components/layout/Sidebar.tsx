// Provides a sidebar skeleton for future dashboard layouts.
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

const sidebarItems = [
  { href: ROUTES.dashboard, label: "대시보드" },
  { href: ROUTES.trends, label: "트렌드" },
  { href: ROUTES.favorites, label: "즐겨찾기" },
  { href: ROUTES.productionBoard, label: "제작 보드" },
  { href: ROUTES.calendar, label: "캘린더" },
  { href: ROUTES.growthReport, label: "성장 리포트" },
  { href: ROUTES.trendingItems, label: "상점" },
  { href: ROUTES.profile, label: "계정 설정" },
];

export function Sidebar() {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Workspace</p>
      <nav className="space-y-1">
        {sidebarItems.map((item) => (
          <Link className="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-ink" href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
