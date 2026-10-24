import { getCurrentSession, getUserPermissions } from "@/server/auth/permissions";
import { User, Shield, Database, Key } from "lucide-react";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  const permissions = session?.user.id
    ? await getUserPermissions(session.user.id)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Workspace Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Account identity, server-side permissions, and system environment details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
              <User className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              User Profile
            </h2>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Display Name</p>
              <p className="font-semibold text-slate-800">
                {session?.user.name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Email Address</p>
              <p className="font-semibold text-slate-800">
                {session?.user.email || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">User Identifier</p>
              <p className="font-mono text-xs text-slate-600">
                {session?.user.id || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Roles & Permissions Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-800">
              <Shield className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              Assigned Server Permissions
            </h2>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-3">
              Server-enforced role privileges for this session:
            </p>
            {permissions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {permissions.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-800"
                  >
                    <Key className="size-3 text-slate-500" />
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No custom permissions assigned. Account operates with default member access.
              </p>
            )}
          </div>
        </div>

        {/* System & Architecture Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <span className="grid size-8 place-items-center rounded-lg bg-purple-100 text-purple-800">
              <Database className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              Architecture & Database Configuration
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 text-xs text-slate-600 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3.5">
              <p className="font-bold text-slate-800">PostgreSQL Schema</p>
              <p className="mt-1 text-slate-500">
                Normalized relational schema managed via Drizzle ORM migrations.
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3.5">
              <p className="font-bold text-slate-800">Ternary Tree Model</p>
              <p className="mt-1 text-slate-500">
                LEFT, MIDDLE, and RIGHT placement slots, a single-root check, and a unique position constraint.
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3.5">
              <p className="font-bold text-slate-800">Authentication</p>
              <p className="mt-1 text-slate-500">
                Better-Auth session engine with argon2/scrypt password hashing & RBAC.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
