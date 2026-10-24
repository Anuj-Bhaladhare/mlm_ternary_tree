import { Clock, CheckCircle2, XCircle } from "lucide-react";

export default function PayoutsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Payout Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Member withdrawal requests, disbursement validation, and settlement tracking.
        </p>
      </div>

      {/* Payout workflow explanation */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <Clock className="size-4" />
            </span>
            <span className="text-xs font-bold uppercase text-slate-500">
              Pending Verification
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">0</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting finance approval</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="size-4" />
            </span>
            <span className="text-xs font-bold uppercase text-slate-500">
              Processed / Settled
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">0</p>
          <p className="mt-1 text-xs text-slate-500">Successfully disbursed</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-700">
              <XCircle className="size-4" />
            </span>
            <span className="text-xs font-bold uppercase text-slate-500">
              Rejected / Returned
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">0</p>
          <p className="mt-1 text-xs text-slate-500">Credited back to wallet</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Payout Request History
            </h2>
            <p className="text-xs text-slate-500">
              Multi-signature and authorized settlement queue
            </p>
          </div>
        </div>

        <div className="py-12 text-center text-sm text-slate-500">
          No payout requests have been submitted.
        </div>
      </div>
    </div>
  );
}
