"use client";

import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Panel } from "@/components/panel";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/components/session-provider";

export default function InsightsPage() {
  const { token } = useSession();
  const [patterns, setPatterns] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadInsights = async () => {
      setLoading(true);
      setError("");

      try {
        const [patternResponse, weeklyResponse, queryResponse] = await Promise.all([
          apiRequest("/analytics/patterns", { token }),
          apiRequest("/ai/weekly-summary", { token }),
          apiRequest("/ai/query", {
            method: "POST",
            token,
            body: {
              question: "What are the biggest health trends in my recent logs?",
            },
          }),
        ]);

        setPatterns(patternResponse.patterns || []);
        setWeeklySummary(weeklyResponse.response || "");
        setAiAnswer(queryResponse.response || "");
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [token]);

  return (
    <ProtectedShell>
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Weekly AI Summary" subtitle="Short read from the last seven days">
          {loading ? (
            <p className="text-sm text-slate-500">Loading weekly summary...</p>
          ) : (
            <p className="text-sm leading-7 text-slate-700">
              {weeklySummary || "No weekly AI summary available yet."}
            </p>
          )}
        </Panel>

        <Panel title="AI Trend Summary" subtitle="Backend AI query using your summarized health data">
          {loading ? (
            <p className="text-sm text-slate-500">Loading AI summary...</p>
          ) : (
            <p className="text-sm leading-7 text-slate-700">
              {aiAnswer || "No AI trend summary available yet."}
            </p>
          )}
        </Panel>
      </section>

      <section className="mt-6">
        <Panel title="Detected Patterns" subtitle="Correlations from the analytics endpoint">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : loading ? (
            <p className="text-sm text-slate-500">Loading patterns...</p>
          ) : (
            <div className="grid gap-3">
              {(patterns.length ? patterns : ["No strong patterns available yet."]).map((pattern) => (
                <div
                  key={pattern}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700"
                >
                  {pattern}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </ProtectedShell>
  );
}
