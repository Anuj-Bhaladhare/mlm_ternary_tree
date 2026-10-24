import { Wallet, ShieldCheck, ArrowDownLeft, ArrowUpRight, Lock } from "lucide-react";

export default function WalletPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Financial Wallet Ledger
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Append-only transactional financial records, debit/credit entries, and wallet balances.
        </p>
      </div>

      {/* Financial integrity banner */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5">
        <div className="flex gap-3">
          <ShieldCheck className="size-5 shrink-0 text-emerald-700" />
          <div className="text-xs text-emerald-950 leading-relaxed">
            <h2 className="text-sm font-bold text-emerald-900">
              Auditable Financial Ledger Model
            </h2>
            <p className="mt-1">
              Balances are never stored as arbitrarily editable numbers. In accordance with Rule 9 of the system architecture, all balances are mathematically derived from an append-only transaction ledger with database-enforced idempotency and audit logs.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Current Balance
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <Wallet className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900">$0.00</span>
            <span className="text-xs text-slate-500">USD</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Reconciled with posted ledger entries
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Credits
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <ArrowDownLeft className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900">$0.00</span>
            <span className="text-xs text-slate-500">USD</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Commissions & earnings posted
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Debits / Payouts
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900">$0.00</span>
            <span className="text-xs text-slate-500">USD</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Processed withdrawals & transfers
          </p>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Wallet Transaction Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Immutable journal of credits, debits, and adjustments
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            <Lock className="size-3 text-slate-500" />
            Immutable
          </span>
        </div>

        <div className="py-12 text-center text-sm text-slate-500">
          No ledger transactions posted yet.
        </div>
      </div>
    </div>
  );
}

