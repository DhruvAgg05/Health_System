"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedShell } from "@/components/protected-shell";
import { Panel } from "@/components/panel";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/components/session-provider";

const defaultForm = {
  mood: 3,
  sleep_hours: 7,
  food_type: "home",
  exercised: false,
  outdoor_exposure: false,
  notes: "",
  symptoms: "",
};

export default function AddLogPage() {
  const router = useRouter();
  const { token } = useSession();
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/logs", {
        method: "POST",
        token,
        body: {
          ...form,
          mood: Number(form.mood),
          sleep_hours: Number(form.sleep_hours),
          symptoms: form.symptoms
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });

      setSuccess("Log saved successfully.");
      setForm(defaultForm);
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedShell>
      <Panel
        title="Add Daily Log"
        subtitle="Capture sleep, symptoms, movement, and notes for today."
      >
        <form className="grid gap-5 lg:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Mood (1-5)</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              type="number"
              min="1"
              max="5"
              value={form.mood}
              onChange={(event) => setForm((current) => ({ ...current, mood: event.target.value }))}
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Sleep Hours</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              type="number"
              min="0"
              max="24"
              step="0.1"
              value={form.sleep_hours}
              onChange={(event) =>
                setForm((current) => ({ ...current, sleep_hours: event.target.value }))
              }
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Food Type</span>
            <select
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              value={form.food_type}
              onChange={(event) =>
                setForm((current) => ({ ...current, food_type: event.target.value }))
              }
            >
              <option value="home">home</option>
              <option value="outside">outside</option>
              <option value="balanced">balanced</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Symptoms (comma separated)
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              type="text"
              placeholder="headache, fatigue"
              value={form.symptoms}
              onChange={(event) =>
                setForm((current) => ({ ...current, symptoms: event.target.value }))
              }
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.exercised}
              onChange={(event) =>
                setForm((current) => ({ ...current, exercised: event.target.checked }))
              }
            />
            <span className="text-sm font-medium text-slate-700">Exercised today</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.outdoor_exposure}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  outdoor_exposure: event.target.checked,
                }))
              }
            />
            <span className="text-sm font-medium text-slate-700">Outdoor exposure</span>
          </label>
          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="What stood out today?"
            />
          </label>
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 lg:col-span-2">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 lg:col-span-2">
              {success}
            </div>
          ) : null}
          <div className="lg:col-span-2">
            <button
              className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
              type="submit"
              disabled={loading}
            >
              {loading ? "Saving log..." : "Save Log"}
            </button>
          </div>
        </form>
      </Panel>
    </ProtectedShell>
  );
}
