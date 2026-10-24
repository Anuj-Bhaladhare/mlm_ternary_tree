"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error boundary triggered:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertCircle className="size-7" />
      </div>
      <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        {error.message || "An unexpected error occurred while processing your request."}
      </p>
      <button
        onClick={() => reset()}
        className="button-primary mt-6"
        type="button"
      >
        <RefreshCw className="size-4" />
        Try again
      </button>
    </div>
  );
}

