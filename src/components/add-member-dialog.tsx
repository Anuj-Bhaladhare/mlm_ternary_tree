"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { AlertCircle, CheckCircle, LoaderCircle, PlusCircle, X } from "lucide-react";

type FormInputs = {
  memberCode: string;
  name: string;
  email: string;
  sponsorId: string;
  parentId: string;
  position: "LEFT" | "MIDDLE" | "RIGHT" | "";
};

export function AddMemberDialog({
  existingMembers = [],
  defaultParentId,
  defaultPosition,
}: {
  existingMembers?: Array<{ id: string; memberCode: string; name: string }>;
  defaultParentId?: string;
  defaultPosition?: "LEFT" | "MIDDLE" | "RIGHT";
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInputs>({
    defaultValues: {
      memberCode: "",
      name: "",
      email: "",
      sponsorId: "",
      parentId: defaultParentId ?? "",
      position: defaultPosition ?? "",
    },
  });

  const [selectedParentId, setSelectedParentId] = useState("");

  async function onSubmit(data: FormInputs) {
    setServerError(null);
    setSuccessMessage(null);
    setActivationUrl(null);
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/admin/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify({
          memberCode: data.memberCode.trim().toUpperCase(),
          name: data.name.trim(),
          email: data.email.trim() || undefined,
          sponsorId: data.sponsorId || undefined,
          parentId: data.parentId || undefined,
          position: data.position || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(
          result.error?.message ||
            "Failed to place member. Please check details and try again.",
        );
        return;
      }

      const member = result.data.member;
      setSuccessMessage(`Member ${member.memberCode} (${member.name}) was placed and is pending activation.`);
      setActivationUrl(result.data.activationUrl ?? null);
      idempotencyKey.current = null;
      reset({
        memberCode: "",
        name: "",
        email: "",
        sponsorId: "",
        parentId: defaultParentId ?? "",
        position: defaultPosition ?? "",
      });
      setSelectedParentId("");
      router.refresh();

    } catch {
      setServerError("Network error. Unable to reach server.");
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setServerError(null);
          setSuccessMessage(null);
          setActivationUrl(null);
          idempotencyKey.current = null;
          setSelectedParentId(defaultParentId ?? "");
          reset({
            memberCode: "",
            name: "",
            email: "",
            sponsorId: "",
            parentId: defaultParentId ?? "",
            position: defaultPosition ?? "",
          });
        }}
        className="button-primary"
        type="button"
      >
        <PlusCircle className="size-4" />
        Add Member
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-headline"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 id="modal-headline" className="text-lg font-bold text-slate-900">
                  Add Network Member
                </h3>
                <p className="text-xs text-slate-500">
                  Enforces ternary placement invariants and audit trail.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                type="button"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {serverError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                <AlertCircle className="size-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
                <CheckCircle className="size-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {activationUrl && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                <p className="font-semibold">Activation link created — copy it now.</p>
                <p className="mt-1 text-blue-800">It expires in 24 hours and will not be shown again after closing this dialog.</p>
                <button
                  className="button-secondary mt-3 w-full text-xs"
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(activationUrl);
                  }}
                >
                  Copy activation link
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label" htmlFor="memberCode">
                    Member Code *
                  </label>
                  <input
                    id="memberCode"
                    className="form-input uppercase"
                    placeholder="e.g. M1001"
                    {...register("memberCode", {
                      required: "Member code is required",
                      pattern: {
                        value: /^[A-Z0-9_-]{3,32}$/i,
                        message: "3-32 alphanumeric characters",
                      },
                    })}
                  />
                  {errors.memberCode && (
                    <span className="form-error">{errors.memberCode.message}</span>
                  )}
                </div>

                <div>
                  <label className="form-label" htmlFor="name">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    className="form-input"
                    placeholder="e.g. Jane Smith"
                    {...register("name", {
                      required: "Name is required",
                      minLength: { value: 2, message: "Min 2 characters" },
                    })}
                  />
                  {errors.name && (
                    <span className="form-error">{errors.name.message}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="email">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  {...register("email", {
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Valid email required if provided",
                    },
                    required: "Email is required for secure account activation",
                  })}
                />
                {errors.email && (
                  <span className="form-error">{errors.email.message}</span>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Genealogy Placement & Sponsorship
                </p>

                <div>
                  <label className="form-label" htmlFor="sponsorId">
                    Sponsor Member
                  </label>
                  <select
                    id="sponsorId"
                    className="form-select text-xs"
                    {...register("sponsorId")}
                  >
                    <option value="">No Sponsor (Direct / Unassigned)</option>
                    {existingMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.memberCode} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="form-label" htmlFor="parentId">
                      Ternary Parent
                    </label>
                    <select
                      id="parentId"
                      className="form-select text-xs"
                      {...register("parentId", {
                        onChange: (e) => setSelectedParentId(e.target.value),
                      })}
                    >
                      <option value="">None (Single Root Node)</option>
                      {existingMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.memberCode} — {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="position">
                      Ternary Position
                    </label>
                    <select
                      id="position"
                      disabled={!selectedParentId}
                      className="form-select text-xs"
                      {...register("position", {
                        validate: (val) => {
                          if (selectedParentId && !val) {
                            return "Position required when parent is selected";
                          }
                          return true;
                        },
                      })}
                    >
                      <option value="">
                        {selectedParentId ? "Select Position" : "N/A for Root"}
                      </option>
                      <option value="LEFT">LEFT</option>
                      <option value="MIDDLE">MIDDLE</option>
                      <option value="RIGHT">RIGHT</option>
                    </select>
                    {errors.position && (
                      <span className="form-error">
                        {errors.position.message}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Note: Leave Parent and Position empty only when creating the single root member of the network.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="button-primary"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Placing...
                    </>
                  ) : (
                    "Confirm Placement"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
