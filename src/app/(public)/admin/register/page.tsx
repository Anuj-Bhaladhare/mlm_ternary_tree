import Link from "next/link";
import { GitFork } from "lucide-react";
import { AdminRegistrationForm } from "@/components/admin-registration-form";

export default function AdminRegistrationPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-5 py-12">
      <section className="w-full max-w-[430px] rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link className="mb-9 inline-flex items-center gap-3" href="/">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white">
            <GitFork aria-hidden="true" className="size-5" />
          </span>
          <span className="text-sm font-bold">Canopy network manager</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Administrator registration
        </h1>
        <p className="mt-2 mb-7 text-sm text-slate-500">
          Registration requires the administrator creation key configured on
          the server. The key is validated securely and never stored with your
          account.
        </p>
        <AdminRegistrationForm />
      </section>
    </main>
  );
}
