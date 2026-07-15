"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const tabs = [
  { href: "/today", label: "Today", symbol: "●" },
  { href: "/calendar", label: "Calendar", symbol: "▦" },
  { href: "/weight", label: "Weight", symbol: "⚖" },
  { href: "/settings", label: "Settings", symbol: "⚙" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-card-border bg-background/95 backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={clsx(
                  "flex flex-col items-center gap-0.5 px-2 py-2.5 text-xs",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <span className="text-base leading-none" aria-hidden>
                  {tab.symbol}
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
