import { Crown } from "lucide-react";

export type MemberRole = "manager" | "student";

const baseClasses =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";

export function MemberRoleBadge({ role }: { role: MemberRole }) {
  if (role === "manager") {
    return (
      <span
        className={`${baseClasses} gap-1 bg-emerald-100 text-emerald-700`}
      >
        <Crown size={12} aria-hidden="true" />
        Gestor
      </span>
    );
  }
  return (
    <span
      className={`${baseClasses} bg-slate-100 text-slate-600 border border-slate-200 font-medium`}
    >
      Aluno
    </span>
  );
}
