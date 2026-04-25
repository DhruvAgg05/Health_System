"use client";

import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Panel } from "@/components/panel";
import { useSession } from "@/components/session-provider";
import { apiRequest, uploadForm } from "@/lib/api";
import { formatLogDate } from "@/lib/format";

const defaultForm = {
  file: null,
  title: "",
  type: "",
  doctor_name: "",
  notes: "",
  follow_up_date: "",
};

export default function ReportsPage() {
  const { token } = useSession();
  const [form, setForm] = useState(defaultForm);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadReports = async () => {
      setLoadingReports(true);

      try {
        const response = await apiRequest("/reports", { token });
        setReports(response.reports || []);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoadingReports(false);
      }
    };

    loadReports();
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", form.file);
      formData.append("title", form.title);
      formData.append("type", form.type);
      formData.append("doctor_name", form.doctor_name);
      formData.append("notes", form.notes);
      formData.append("follow_up_date", form.follow_up_date);

      const response = await uploadForm("/reports", {
        formData,
        token,
      });

      setReports((current) => [response.report, ...current]);
      setSuccess("Medical report uploaded successfully.");
      setForm(defaultForm);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProtectedShell>
      <div className="grid gap-6">
        <Panel
          title="Upload Medical Report"
          subtitle="Upload PDFs or images and store the report details alongside the file."
        >
          <form className="grid gap-5 lg:grid-cols-2" onSubmit={handleSubmit}>
            <label className="block lg:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">File</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) =>
                  setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))
                }
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Title</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                type="text"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Type</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                type="text"
                placeholder="lab, scan, prescription"
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Doctor Name</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                type="text"
                value={form.doctor_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, doctor_name: event.target.value }))
                }
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Follow Up Date</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                type="date"
                value={form.follow_up_date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, follow_up_date: event.target.value }))
                }
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
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
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Medical Report"}
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Uploaded Reports" subtitle="Your previously uploaded medical documents">
          {loadingReports ? (
            <p className="text-sm text-slate-500">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-slate-500">No medical reports uploaded yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Report</p>
                      <h3 className="mt-1 text-lg font-semibold text-ink">
                        {report.title || "Untitled report"}
                      </h3>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                      {report.type || "general"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>Doctor: {report.doctor_name || "Not provided"}</p>
                    <p>Uploaded: {formatLogDate(report.created_at)}</p>
                    <p>
                      Follow up:{" "}
                      {report.follow_up_date ? formatLogDate(report.follow_up_date) : "Not set"}
                    </p>
                  </div>

                  {report.notes ? (
                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                      {report.notes}
                    </div>
                  ) : null}

                  <a
                    href={report.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
                  >
                    Open File
                  </a>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </ProtectedShell>
  );
}
