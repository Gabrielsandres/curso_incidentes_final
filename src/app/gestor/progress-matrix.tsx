import { getInstitutionMembersWithProgress } from "@/lib/institutions/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MatrixCell } from "@/lib/institutions/types";
import { MdheContactCard } from "@/components/marketing/mdhe-contact-card";

interface Props {
  institutionId: string;
}

function ProgressCell({ cell }: { cell: MatrixCell | null }) {
  if (!cell) {
    return <td className="px-4 py-3 text-center text-slate-300">—</td>;
  }

  const is100 = cell.completionPercentage === 100;
  const isExpired = cell.enrollmentExpired;

  const percentClass = isExpired
    ? "text-sm text-slate-400"
    : is100
      ? "text-sm font-semibold text-emerald-700"
      : "text-sm font-semibold text-slate-900";
  const subClass = isExpired ? "text-xs text-slate-400" : "text-xs text-slate-500";

  return (
    <td className="px-4 py-3">
      <div className={percentClass}>{cell.completionPercentage}%</div>
      <div className={subClass}>
        {cell.completedLessons}/{cell.totalLessons} {cell.totalLessons === 1 ? "aula" : "aulas"}
      </div>
      {isExpired ? (
        <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
          Expirado
        </span>
      ) : null}
    </td>
  );
}

export async function ProgressMatrix({ institutionId }: Props) {
  const adminClient = createSupabaseAdminClient();
  const members = await getInstitutionMembersWithProgress(adminClient, institutionId);

  // Empty state #1 — D-13: 0 alunos vinculados
  if (members.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Nenhum aluno vinculado ainda</p>
          <p className="mt-1 text-sm text-slate-500">
            Para vincular sua equipe à plataforma, entre em contato com a MDHE Consultoria.
          </p>
        </div>
        <MdheContactCard />
      </div>
    );
  }

  // Collect distinct courses across all members (column set)
  const courseMap = new Map<string, { id: string; title: string; slug: string }>();
  for (const m of members) {
    for (const c of m.courses) {
      if (!courseMap.has(c.courseId)) {
        courseMap.set(c.courseId, { id: c.courseId, title: c.courseTitle, slug: c.courseSlug });
      }
    }
  }
  const courses = Array.from(courseMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title, "pt-BR"),
  );

  // Empty state #2 — D-13: >0 alunos but 0 enrollments anywhere
  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-700">
          Sua equipe ainda não tem acesso a nenhum curso
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Aguarde a MDHE liberar o acesso aos cursos contratados. Você verá o progresso da equipe
          aqui assim que as matrículas forem realizadas.
        </p>
      </div>
    );
  }

  // Index per-member courses for quick lookup
  const cellLookup = new Map<string, MatrixCell>();
  for (const m of members) {
    for (const c of m.courses) {
      cellLookup.set(`${m.profileId}::${c.courseId}`, c);
    }
  }

  // Sort members by name (pt-BR locale)
  const sortedMembers = [...members].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "pt-BR"),
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Progresso da equipe por curso</caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
            >
              Aluno
            </th>
            {courses.map((c) => (
              <th
                key={c.id}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
              >
                <span title={c.title} className="block max-w-[160px] truncate">
                  {c.title}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedMembers.map((m) => (
            <tr key={m.profileId} className="border-b border-slate-100 last:border-b-0">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900"
              >
                {m.fullName}
              </th>
              {courses.map((c) => (
                <ProgressCell
                  key={`${m.profileId}-${c.id}`}
                  cell={cellLookup.get(`${m.profileId}::${c.id}`) ?? null}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
