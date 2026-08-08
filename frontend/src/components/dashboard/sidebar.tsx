"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  FileText,
  Inbox,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Users,
} from "lucide-react";

import { SidebarNavItem } from "@/components/dashboard/sidebar-nav-item";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/ai-persona", label: "AI Persona", icon: Bot },
  { href: "/dashboard/templates", label: "Email Templates", icon: FileText },
  { href: "/dashboard", label: "Lead List", icon: Users },
  { href: "/dashboard/connections", label: "Connections", icon: Plug },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const toggle = () => setCollapsed((prev) => !prev);

  return (
    <TooltipProvider delayDuration={200}>
      <motion.aside
        className={cn(
          "sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-border/70 bg-sidebar/35 backdrop-blur-xl",
          collapsed ? "w-16" : "w-56",
        )}
        animate={{ width: collapsed ? 64 : 224 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      >
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/70 px-2.5">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <AnimatePresence initial={false} mode="wait">
              {!collapsed ? (
                <motion.span
                  key="sidebar-brand"
                  className="truncate text-sm font-semibold text-foreground"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                >
                  AI Outreach
                </motion.span>
              ) : null}
            </AnimatePresence>
          </Link>

          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition duration-150",
              "hover:bg-accent hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0" />
            )}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 p-3.5">
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem key={item.href} {...item} collapsed={collapsed} />
          ))}
        </nav>
      </motion.aside>
    </TooltipProvider>
  );
}
