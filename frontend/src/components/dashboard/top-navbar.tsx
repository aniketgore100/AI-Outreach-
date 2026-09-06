"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutUser } from "@/store/slices/auth.slice";

function getInitials(
  companyName: string | undefined,
  email: string | undefined,
): string {
  const source = companyName?.trim() || email || "?";
  return source.slice(0, 2).toUpperCase();
}

// Mirrors the top-level entries in Sidebar's NAV_ITEMS — every primary
// section gets its name shown here as a persistent breadcrumb, regardless
// of whether the page also renders its own in-content title.
const SECTION_TITLES: Record<string, string> = {
  "/dashboard/campaigns": "Campaigns",
  "/dashboard/inbox": "Inbox",
  "/dashboard/templates": "Email Templates",
  "/dashboard": "Lead List",
  "/dashboard/connections": "Connections",
};

export function TopNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.push("/login");
  };

  const sectionTitle = SECTION_TITLES[pathname];

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between border-b border-border/70 bg-background px-3 sm:px-4">
      {sectionTitle ? <h2 className="text-sm font-medium text-foreground">{sectionTitle}</h2> : <span />}

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="rounded-full outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Avatar>
            <AvatarFallback>
              {getInitials(user?.companyName, user?.email)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              {user?.companyName}
            </span>
            <span className="truncate text-small text-muted-foreground">
              {user?.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={handleLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
