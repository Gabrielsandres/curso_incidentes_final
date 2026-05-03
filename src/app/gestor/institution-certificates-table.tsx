import { getInstitutionCertificates } from "@/lib/institutions/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface Props {
  institutionId: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export async function InstitutionCertificatesTable({ institutionId }: Props) {
  const adminClient = createSupabaseAdminClient();
  const certificates = await getInstitutionCertificates(adminClient, institutionId);

  // Empty state #3 — D-13: cert section
  if (certificates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-700">Nenhum certificado emitido ainda</p>
        <p className="mt-1 text-sm text-slate-500">
          Certificados aparecem aqui quando seus alunos concluírem 100% das aulas de um curso.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left">
        <caption className="sr-only">Certificados emitidos para alunos da sua equipe</caption>
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
            >
              Aluno
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
            >
              Curso
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
            >
              Data de emissão
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
            >
              Código
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {certificates.map((cert, idx) => (
            <tr key={`${cert.certificateCode}-${idx}`}>
              <td className="px-4 py-3 text-sm text-slate-900">{cert.studentName}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{cert.courseTitle}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{formatDate(cert.issuedAt)}</td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-slate-700 select-all">
                  {cert.certificateCode}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
