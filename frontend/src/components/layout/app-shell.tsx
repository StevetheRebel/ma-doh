"use client";

import {
  ChartNoAxesCombined,
  House,
  Landmark,
  ListChecks,
  Repeat2,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppTopbar } from "@/components/layout/app-topbar";
import { QuickCaptureMenu } from "@/components/layout/quick-capture-menu";

import { useTransactions } from "@/features/transactions/transaction-provider";
import { useAuth } from "@/features/auth/auth-provider";

import styles from "./app-shell.module.css";

const navItems = [
  { label: "Home", href: "/dashboard", icon: House },
  { label: "Transactions", href: "/transactions", icon: ListChecks },
  { label: "Insights", href: "/insights", icon: ChartNoAxesCombined },
  { label: "Ask My Money", href: "/ask", icon: Sparkles },
  {
    label: "Financial position",
    href: "/position",
    icon: Landmark,
    separated: true,
  },
  { label: "Recurring", href: "/recurring", icon: Repeat2 },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile } = useTransactions();
  const { session } = useAuth();
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <AppTopbar />

      <aside className={styles.sidebar} aria-label="Primary navigation">
        <nav className={styles.sidebarNav}>
          {navItems.map(({ label, href, icon: Icon, ...item }) => (
            <Link
              className={`${styles.navLink} ${"separated" in item ? styles.separated : ""} ${isActive(pathname, href) ? styles.active : ""}`}
              href={href}
              key={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">
            {profile.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{profile.name}</strong>
            <span>{session?.user.email}</span>
          </div>
        </div>
      </aside>

      <main
        className={`${styles.main} ${pathname === "/dashboard" ? styles.dashboardMain : ""}`}
      >
        {children}
      </main>

      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        <Link
          className={pathname === "/dashboard" ? styles.mobileActive : ""}
          href="/dashboard"
          aria-current={pathname === "/dashboard" ? "page" : undefined}
        >
          <House size={21} aria-hidden="true" />
          <span>Home</span>
        </Link>
        <Link
          className={
            pathname.startsWith("/transactions") && !pathname.includes("/add")
              ? styles.mobileActive
              : ""
          }
          href="/transactions"
          aria-current={pathname === "/transactions" ? "page" : undefined}
        >
          <ListChecks size={21} aria-hidden="true" />
          <span>Records</span>
        </Link>
        <Link
          className={pathname.startsWith("/ask") ? styles.mobileActive : ""}
          href="/ask"
          aria-current={pathname.startsWith("/ask") ? "page" : undefined}
        >
          <Sparkles size={21} aria-hidden="true" />
          <span>Ask</span>
        </Link>
      </nav>

      <QuickCaptureMenu />
    </div>
  );
}
