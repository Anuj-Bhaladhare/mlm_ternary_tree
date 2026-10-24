export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8">
      <div className="size-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" />
      <p className="mt-4 text-sm font-medium text-slate-500">Loading...</p>
    </div>
  );
}

