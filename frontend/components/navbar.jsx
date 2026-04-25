"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";

const protectedLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/add-log", label: "Add Log" },
  { href: "/reports", label: "Reports" },
  { href: "/ai", label: "AI" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { token, clearSession } = useSession();

  const navLinks = token
    ? protectedLinks
    : [
        { href: "/login", label: "Login" },
        { href: "/signup", label: "Signup" },
      ];

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href={token ? "/dashboard" : "/login"} className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-sm font-bold text-white">
            AH
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Platform</p>
            <p className="text-sm font-semibold text-ink">AI Health Analytics</p>
          </div>
        </Link>

        <nav className="order-3 flex w-full flex-wrap items-center gap-2 md:order-2 md:w-auto">
          {navLinks.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-ink text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {token ? (
          <button
            type="button"
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
            className="order-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 md:order-3"
          >
            Logout
          </button>
        ) : null}
      </div>
    </header>
  );
}
