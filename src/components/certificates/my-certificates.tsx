"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, Lock, Sparkles } from "lucide-react";

import type { DashboardCourseCertificate } from "@/lib/courses/types";

type MyCertificatesProps = {
  certificates: DashboardCourseCertificate[];
};

type LoadingMap = Record<string, boolean | undefined>;
type CertificateOverrides = Record<
  string,
  | {
      status: "ISSUED";
      issuedAt: string | null;
      certificateCode: string | null;
    }
  | undefined
>;

export function MyCertificates({ certificates }: MyCertificatesProps) {
  const [loadingByCourseId, setLoadingByCourseId] = useState<LoadingMap>({});
  const [errorByCourseId, setErrorByCourseId] = useState<Record<string, string | undefined>>({});
  const [certificateOverrides, setCertificateOverrides] = useState<CertificateOverrides>({});

  const hasCertificates = certificates.length > 0;
  const issuedCount = useMemo(
    () => certificates.filter((certificate) => certificate.status === "ISSUED").length,
    [certificates],
  );

  async function handleDownloadCertificate(courseId: string) {
    setLoadingByCourseId((previous) => ({ ...previous, [courseId]: true }));
    setErrorByCourseId((previous) => ({ ...previous, [courseId]: undefined }));

    try {
      const response = await fetch("/api/certificates/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      const body = (await response.json().catch(() => null)) as {
        message?: string;
        url?: string;
        issuedAt?: string;
        certificateCode?: string;
      } | null;

      if (!response.ok || !body?.url) {
        throw new Error(body?.message || "Nao foi possivel gerar o certificado.");
      }

      setCertificateOverrides((previous) => ({
        ...previous,
        [courseId]: {
          status: "ISSUED",
          issuedAt: body.issuedAt ?? null,
          certificateCode: body.certificateCode ?? null,
        },
      }));

      const anchor = document.createElement("a");
      anchor.href = body.url;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      anchor.download = "";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      setErrorByCourseId((previous) => ({
        ...previous,
        [courseId]: error instanceof Error ? error.message : "Nao foi possivel baixar o certificado.",
      }));
    } finally {
      setLoadingByCourseId((previous) => ({ ...previous, [courseId]: undefined }));
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Certificados</p>
          <h2 className="text-xl font-semibold text-slate-900">Meus Certificados</h2>
          <p className="mt-1 text-sm text-slate-600">
            Conclua todas as aulas de cada curso para liberar o certificado digital.
          </p>
        </div>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          {issuedCount} emitido{issuedCount === 1 ? "" : "s"}
        </span>
      </header>

      {!hasCertificates ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          Nenhum curso com certificado foi configurado ate o momento.
        </div>
      ) : (
        <ul className="space-y-3">
          {certificates.map((certificate) => {
            const override = certificateOverrides[certificate.courseId];
            const resolvedStatus = override?.status ?? certificate.status;
            const resolvedIssuedAt = override?.issuedAt ?? certificate.issuedAt;
            const resolvedCertificateCode = override?.certificateCode ?? certificate.certificateCode;
            const loading = Boolean(loadingByCourseId[certificate.courseId]);
            const blocked = resolvedStatus === "IN_PROGRESS";
            const buttonLabel =
              resolvedStatus === "ISSUED" ? "Baixar certificado" : resolvedStatus === "ELIGIBLE" ? "Gerar e baixar" : "Indisponivel";

            return (
              <li key={certificate.courseId} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{certificate.courseTitle}</p>
                      <StatusBadge status={resolvedStatus} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Progresso: {certificate.completedLessons}/{certificate.totalLessons} aulas ({certificate.completionPercentage}%)
                    </p>
                    {resolvedStatus === "ISSUED" && resolvedIssuedAt ? (
                      <p className="text-xs text-slate-500">
                        Emitido em {new Date(resolvedIssuedAt).toLocaleDateString("pt-BR")} • Codigo {resolvedCertificateCode}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <button
                      type="button"
                      disabled={blocked || loading}
                      onClick={() => void handleDownloadCertificate(certificate.courseId)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                        blocked
                          ? "border border-slate-300 bg-white text-slate-500"
                          : "bg-sky-600 text-white hover:bg-sky-700"
                      }`}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : blocked ? (
                        <Lock className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden="true" />
                      )}
                      {buttonLabel}
                    </button>
                    {errorByCourseId[certificate.courseId] ? (
                      <p className="text-xs text-red-600">{errorByCourseId[certificate.courseId]}</p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: DashboardCourseCertificate["status"] }) {
  if (status === "ISSUED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        Emitido
      </span>
    );
  }

  if (status === "ELIGIBLE") {
    return (
      <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
        Elegivel
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
      Em andamento
    </span>
  );
}
