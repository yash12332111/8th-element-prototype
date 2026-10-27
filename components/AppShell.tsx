"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

const ROLE_LABELS: Record<Role, string> = {
  ae: "Account Executive",
  implementation: "Implementation Lead",
  csm: "Customer Success Manager",
  vp_cs: "VP Customer Success",
};

const NAV_ITEMS = [
  { href: "/deals", label: "Deals" },
  { href: "/approvals", label: "Approvals" },
  { href: "/accounts", label: "Accounts" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/eval", label: "AI Accuracy" },
  { href: "/try", label: "Try Sandbox" },
  { href: "/about", label: "About" },
];

/** Inner nav component that uses usePathname — wrapped in Suspense at the call-site */
function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="app-nav">
      {NAV_ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`nav-link ${pathname?.startsWith(href) ? "nav-link-active" : ""}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const resetDemo = useStore((s) => s.resetDemo);

  // Hydration guard — wait until Zustand has rehydrated from localStorage
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    // In case hydration already finished before this effect ran
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return () => unsub();
  }, []);

  if (!hydrated) {
    return (
      <div className="shell-skeleton">
        <div className="skeleton-bar" />
        <div className="skeleton-nav" />
        <div className="skeleton-body" />
      </div>
    );
  }

  return (
    <>
      {/* Fictional data banner */}
      <div className="banner-fictional">
        Synthetic demo: all companies, people, calls and numbers are fictional.
      </div>

      {/* Main header */}
      <header className="app-header">
        <Link href="/" className="app-logo">
          <span className="app-logo-mark">K</span>
          <span className="app-logo-text">Kept</span>
        </Link>

        {/* Navigation — in Suspense because usePathname is dynamic */}
        <Suspense fallback={<nav className="app-nav" />}>
          <AppNav />
        </Suspense>

        {/* Role switcher + Reset */}
        <div className="header-controls">
          <div className="role-switcher">
            <span className="role-label">Role:</span>
            <select
              id="role-switcher"
              className="role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <button
            id="reset-demo-btn"
            className="btn-reset"
            onClick={() => {
              if (confirm("Reset the demo? All changes will be lost.")) resetDemo();
            }}
          >
            Reset demo
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="app-main">{children}</main>
    </>
  );
}
