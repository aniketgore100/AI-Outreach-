"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNavbar } from "@/components/dashboard/top-navbar";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, isInitialized } = useAppSelector((state) => state.auth);
  // The connections page and the template editor's two-panel layout both
  // want the full viewport width rather than the centered content column.
  const isFullWidthPage =
    pathname === "/dashboard/connections" ||
    pathname === "/dashboard/inbox" ||
    pathname.startsWith("/dashboard/templates/") ||
    pathname.startsWith("/dashboard/campaigns/");
  const isEdgeToEdgePage = pathname === "/dashboard/inbox" || pathname.startsWith("/dashboard/campaigns/");

  useEffect(() => {
    if (isInitialized && !accessToken) {
      router.replace("/login");
    }
  }, [isInitialized, accessToken, router]);

  if (!isInitialized || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("flex bg-background", isEdgeToEdgePage ? "h-screen overflow-hidden" : "min-h-screen")}>
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className={cn("min-w-0 min-h-0 flex-1", isEdgeToEdgePage ? "overflow-hidden" : "px-3 py-3 sm:px-4 sm:py-4")}>
          <div className={isFullWidthPage ? "h-full min-h-0 w-full" : "mx-auto w-full max-w-[1600px]"}>{children}</div>
        </main>
      </div>
    </div>
  );
}
