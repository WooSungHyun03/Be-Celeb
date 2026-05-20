"use client";

import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants/routes";

type MainFrameProps = {
  children: React.ReactNode;
};

const fullBleedRoutes = new Set([
  ROUTES.home,
  ROUTES.login,
  ROUTES.signup,
  ROUTES.findId,
  ROUTES.forgotPassword,
  "/reset-password",
  ROUTES.logout,
]);

export function MainFrame({ children }: MainFrameProps) {
  const pathname = usePathname();
  const isProductionBoard = pathname === ROUTES.productionBoard || pathname.startsWith(`${ROUTES.productionBoard}/`);
  const isFullBleed = fullBleedRoutes.has(pathname) || isProductionBoard;

  if (isFullBleed) {
    return <main className="min-h-[calc(100vh-180px)] w-full">{children}</main>;
  }

  return (
    <main className="min-h-[calc(100vh-180px)] w-full bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_360px,#f6f8fb_100%)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}
