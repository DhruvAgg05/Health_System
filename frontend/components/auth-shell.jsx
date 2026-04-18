import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  footerText,
  footerLink,
  footerLabel,
  children,
}) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] bg-ink bg-hero-mesh p-8 text-white shadow-panel lg:p-12">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-100">AI Health Analytics</p>
        <h1 className="mt-4 max-w-xl font-serif text-5xl font-semibold leading-tight">
          See the story behind your daily health habits.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">
          Log mood, sleep, exercise, symptoms, and food choices. Then let the platform surface
          patterns, weekly summaries, and exportable reports from your own data.
        </p>
      </div>

      <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-panel">
        <h2 className="font-serif text-3xl font-semibold text-ink">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{subtitle}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-6 text-sm text-slate-500">
          {footerText}{" "}
          <Link href={footerLink} className="font-semibold text-sky-700 hover:text-sky-800">
            {footerLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
