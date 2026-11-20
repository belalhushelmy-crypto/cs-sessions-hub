export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white lg:col-span-2 dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
      </div>
    </div>
  );
}
