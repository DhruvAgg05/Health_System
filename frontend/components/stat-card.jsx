export function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
