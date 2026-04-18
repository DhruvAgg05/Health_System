"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedShell } from "@/components/protected-shell";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/components/session-provider";
import { StatCard } from "@/components/stat-card";
import { Panel } from "@/components/panel";
import { formatLogDate } from "@/lib/format";

export default function DashboardPage() {
  const { token, user } = useSession();
  const [logs, setLogs] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [logResponse, patternResponse, weeklySummaryResponse] = await Promise.all([
          apiRequest("/logs", { token }),
          apiRequest("/analytics/patterns", { token }),
          apiRequest("/ai/weekly-summary", { token }),
        ]);

        setLogs(logResponse.logs || []);
        setPatterns(patternResponse.patterns || []);
        setWeeklySummary(weeklySummaryResponse.response || "");
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token]);

  const avgMood =
    logs.length > 0
      ? (logs.reduce((sum, log) => sum + Number(log.mood), 0) / logs.length).toFixed(1)
      : "0.0";
  const avgSleep =
    logs.length > 0
      ? (logs.reduce((sum, log) => sum + Number(log.sleep_hours), 0) / logs.length).toFixed(1)
      : "0.0";
  const exerciseDays = logs.filter((log) => log.exercised).length;

  return (
    <ProtectedShell>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-[2rem] bg-ink bg-hero-mesh p-8 text-white shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-sky-100">Dashboard</p>
              <h1 className="mt-3 font-serif text-4xl font-semibold">
                {user?.name ? `Welcome back, ${user.name}` : "Your health command center"}
              </h1>
            </div>
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-100">
              AI-assisted view
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-slate-200">
            Review your recent logs, spot recurring patterns, and jump straight into action with
            quick links to add a new entry or open the insights view.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/add-log"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-sky-50"
            >
              Add Today&apos;s Log
            </Link>
            <Link
              href="/ai"
              className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/10"
            >
              Open AI
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <StatCard label="Recent Logs" value={String(logs.length)} detail="Last 30 entries" />
          <StatCard label="Avg Mood" value={`${avgMood}/5`} detail="Across recent logs" />
          <StatCard label="Avg Sleep" value={`${avgSleep}h`} detail={`${exerciseDays} exercise days`} />
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="mt-6">
        <div className="overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-teal-50 shadow-panel">
          <div className="grid gap-6 p-6 lg:grid-cols-[0.7fr_1.3fr] lg:p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-sky-700">AI Weekly Summary</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-ink">Your top-level read</h2>
            </div>
            <div className="rounded-[1.5rem] border border-white/80 bg-white/80 px-5 py-5">
              <p className="text-sm leading-7 text-slate-700">
                {loading
                  ? "Loading AI summary..."
                  : weeklySummary || "Your weekly AI summary will appear here once enough data is available."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Logs Timeline" subtitle="Recent entries presented as compact health cards">
          {loading ? (
            <p className="text-sm text-slate-500">Loading logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-500">No logs yet. Add your first daily log.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {logs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 transition hover:-translate-y-0.5 hover:shadow-panel"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Daily log</p>
                      <p className="mt-1 text-base font-semibold text-ink">
                        {formatLogDate(log.log_date)}
                      </p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Mood {log.mood}/5
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sleep</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{log.sleep_hours}h</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Food</p>
                      <p className="mt-1 text-lg font-semibold capitalize text-ink">{log.food_type}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      Exercise {log.exercised ? "Yes" : "No"}
                    </span>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                      Outdoor {log.outdoor_exposure ? "Yes" : "No"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Symptoms</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {log.symptoms.length ? log.symptoms.join(", ") : "None reported"}
                    </p>
                  </div>

                  {log.notes ? (
                    <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      {log.notes}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Pattern Highlights" subtitle="Fast read from the analytics endpoint">
          {loading ? (
            <p className="text-sm text-slate-500">Loading patterns...</p>
          ) : (
            <div className="space-y-4">
              {(patterns.length ? patterns : ["Patterns will appear once enough data is available."]).map(
                (pattern, index) => (
                  <div
                    key={pattern}
                    className={`rounded-[1.75rem] border px-5 py-5 text-sm leading-7 shadow-sm ${
                      index % 3 === 0
                        ? "border-sky-100 bg-sky-50 text-slate-700"
                        : index % 3 === 1
                          ? "border-emerald-100 bg-emerald-50 text-slate-700"
                          : "border-amber-100 bg-amber-50 text-slate-700"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pattern</p>
                    <p className="mt-2">{pattern}</p>
                  </div>
                )
              )}
            </div>
          )}
        </Panel>
      </section>
    </ProtectedShell>
  );
}
