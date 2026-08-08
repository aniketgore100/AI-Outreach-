"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNavbar } from "@/components/dashboard/top-navbar";
import { useAppSelector } from "@/store/hooks";

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, isInitialized } = useAppSelector((state) => state.auth);
  const isConnectionsPage = pathname === "/dashboard/connections";

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
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className={isConnectionsPage ? "w-full" : "mx-auto w-full max-w-6xl"}>{children}</div>
        </main>
      </div>
    </div>
  );
}
