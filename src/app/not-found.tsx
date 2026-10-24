import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        <FileQuestion className="size-7" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/dashboard" className="button-primary mt-6">
        <ArrowLeft className="size-4" />
        Return to Dashboard
      </Link>
    </div>
  );
}

