export function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-panel">
      <div className="mb-5">
        <h2 className="font-serif text-2xl font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
