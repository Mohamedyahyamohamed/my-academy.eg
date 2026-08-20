export default function AppLoading() {
  return (
    <div
      className="space-y-6 animate-pulse"
      dir="rtl"
      aria-label="جارٍ تحميل الصفحة"
      role="status"
    >
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-72 rounded bg-muted/70" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl border bg-card p-5 shadow-sm">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="mt-5 h-8 w-14 rounded bg-muted/80" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl border bg-card p-5 shadow-sm" />
        <div className="h-64 rounded-xl border bg-card p-5 shadow-sm" />
      </div>

      <span className="sr-only">جارٍ تحميل الصفحة…</span>
    </div>
  );
}
