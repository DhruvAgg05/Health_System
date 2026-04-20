"use client";

import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Panel } from "@/components/panel";
import { useSession } from "@/components/session-provider";
import { apiRequest } from "@/lib/api";

export default function AiPage() {
  const { token } = useSession();
  const [question, setQuestion] = useState("What are the biggest trends in my recent health logs?");
  const [answer, setAnswer] = useState("");
  const [weeklySummary, setWeeklySummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadWeeklySummary = async () => {
      setLoadingSummary(true);
      setError("");

      try {
        const response = await apiRequest("/ai/weekly-summary", { token });
        setWeeklySummary(response.response || "");
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoadingSummary(false);
      }
    };

    loadWeeklySummary();
  }, [token]);

  const handleAskAi = async (event) => {
    event.preventDefault();
    setLoadingAnswer(true);
    setError("");

    try {
      const response = await apiRequest("/ai/query", {
        method: "POST",
        token,
        body: { question },
      });

      setAnswer(response.response || "");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingAnswer(false);
    }
  };

  return (
    <ProtectedShell>
      <div className="grid gap-6">
        <Panel title="AI Weekly Summary" subtitle="Short summary generated from your last 7 days of logs">
          <p className="text-sm leading-7 text-slate-700">
            {loadingSummary
              ? "Loading weekly AI summary..."
              : weeklySummary || "No weekly summary available yet."}
          </p>
        </Panel>

        <Panel title="Ask AI About Your Health Data" subtitle="Your question is sent to the backend AI query endpoint">
          <form className="space-y-4" onSubmit={handleAskAi}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Question</span>
              <textarea
                className="min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask about patterns, habits, or trends in your logs"
                required
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
              type="submit"
              disabled={loadingAnswer}
            >
              {loadingAnswer ? "Asking AI..." : "Ask AI"}
            </button>
          </form>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">AI Response</p>
            {loadingAnswer ? (
              <p className="mt-3 text-sm leading-7 text-slate-500">Generating response...</p>
            ) : (
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {answer || "Your AI response will appear here after you submit a question."}
              </p>
            )}
          </div>
        </Panel>
      </div>
    </ProtectedShell>
  );
}
