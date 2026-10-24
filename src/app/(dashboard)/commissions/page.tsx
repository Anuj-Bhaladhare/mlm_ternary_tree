import { CircleDollarSign, AlertTriangle, ShieldCheck, FileText } from "lucide-react";

export default function CommissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Commissions & Compensation
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Compensation plan configuration and commission history.
        </p>
      </div>

      {/* Policy notice based on AGENTS.md Section 10 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="size-5 shrink-0 text-amber-700" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <h2 className="text-sm font-bold text-amber-900">
              Approved Compensation Plan Required
            </h2>
            <p className="mt-1">
              In accordance with project architecture guidelines, the compensation engine is isolated and strictly requires an approved compensation specification before executing financial calculations. No fabricated rates or percentages are permitted.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
              <ShieldCheck className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              Ternary Compensation Engine Specification
            </h2>
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-600">
            <p>
              When a compensation plan is configured, the engine calculates:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>LEFT, MIDDLE, and RIGHT business-volume matching, only if defined by the approved plan</li>
              <li>Triad or cycle bonuses and carry-forward rules, only if approved</li>
              <li>Direct referral bonuses tied to verified sales events</li>
              <li>Daily, weekly, or monthly caps and rank eligibility limits</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-800">
              <FileText className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              Commission Ledger Invariants
            </h2>
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-600">
            <p>
              All commission calculations follow transactional audit standards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>Deterministic arithmetic without floating-point errors</li>
              <li>Idempotency keys preventing duplicate commission runs</li>
              <li>Audit log record for every calculation input and rule version</li>
              <li>Direct integration with the double-entry wallet ledger</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
          <CircleDollarSign className="size-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900">
          No Commission Events Recorded
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Commissions will appear here once an approved compensation plan is active and qualifying sales events are processed.
        </p>
      </div>
    </div>
  );
}
