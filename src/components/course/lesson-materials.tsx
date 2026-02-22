"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, FileArchive, FileText, Link2, Loader2 } from "lucide-react";

import type { MaterialRow } from "@/lib/courses/types";
import { formatFileSize } from "@/lib/materials/storage";

type LessonMaterialsProps = {
  materials: MaterialRow[];
};

type LoadingState = Record<string, "view" | "download" | undefined>;

export function LessonMaterials({ materials }: LessonMaterialsProps) {
  const [loadingByMaterialId, setLoadingByMaterialId] = useState<LoadingState>({});
  const [errorByMaterialId, setErrorByMaterialId] = useState<Record<string, string | undefined>>({});

  const hasMaterials = materials.length > 0;

  async function handleOpenMaterial(material: MaterialRow, mode: "view" | "download") {
    const sourceKind = (material.source_kind ?? "LINK").toUpperCase();
    const isUpload = sourceKind === "UPLOAD";

    if (!isUpload && material.resource_url) {
      openUrl(material.resource_url, mode === "download");
      return;
    }

    setLoadingByMaterialId((prev) => ({ ...prev, [material.id]: mode }));
    setErrorByMaterialId((prev) => ({ ...prev, [material.id]: undefined }));

    try {
      const response = await fetch("/api/materials/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: material.id, mode }),
      });

      const body = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;

      if (!response.ok || !body?.url) {
        throw new Error(body?.message || "Nao foi possivel abrir o material.");
      }

      openUrl(body.url, mode === "download");
    } catch (error) {
      setErrorByMaterialId((prev) => ({
        ...prev,
        [material.id]: error instanceof Error ? error.message : "Nao foi possivel abrir o material.",
      }));
    } finally {
      setLoadingByMaterialId((prev) => ({ ...prev, [material.id]: undefined }));
    }
  }

  const materialCountLabel = useMemo(() => `${materials.length} ${materials.length === 1 ? "item" : "itens"}`, [materials.length]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Materiais</p>
          <h2 className="text-xl font-semibold text-slate-900">Recursos complementares</h2>
          <p className="mt-1 text-sm text-slate-600">
            Arquivos e links de apoio para revisar a aula, baixar documentos e aprofundar o conteudo.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {materialCountLabel}
        </span>
      </header>

      {!hasMaterials ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          Nenhum material complementar foi adicionado para esta aula.
        </div>
      ) : (
        <ul className="space-y-3">
          {materials.map((material) => {
            const config = getMaterialUi(material);
            const loadingMode = loadingByMaterialId[material.id];
            const sourceKind = (material.source_kind ?? "LINK").toUpperCase();
            const fileSizeLabel = formatFileSize(material.file_size_bytes);

            return (
              <li
                key={material.id}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm shadow-slate-100/40"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className={`rounded-lg p-2 ${config.iconBgClass}`}>
                      <config.icon className={`h-5 w-5 ${config.iconClass}`} aria-hidden="true" />
                    </span>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{material.label}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          {material.material_type}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          {sourceKind}
                        </span>
                      </div>

                      {material.description ? (
                        <p className="text-sm leading-relaxed text-slate-600">{material.description}</p>
                      ) : (
                        <p className="text-sm text-slate-500">{config.defaultDescription}</p>
                      )}

                      {sourceKind === "UPLOAD" ? (
                        <p className="text-xs text-slate-500">
                          {material.original_file_name ?? "Arquivo anexado"}
                          {fileSizeLabel ? ` • ${fileSizeLabel}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleOpenMaterial(material, "view")}
                        disabled={Boolean(loadingMode)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {loadingMode === "view" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
                        Visualizar
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleOpenMaterial(material, "download")}
                        disabled={Boolean(loadingMode)}
                        className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {loadingMode === "download" ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : config.suggestDownload ? (
                          <Download className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Link2 className="h-4 w-4" aria-hidden="true" />
                        )}
                        {config.suggestDownload ? "Baixar" : "Abrir"}
                      </button>
                    </div>

                    {errorByMaterialId[material.id] ? (
                      <p className="text-xs text-red-600">{errorByMaterialId[material.id]}</p>
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

function openUrl(url: string, preferDownload: boolean) {
  if (preferDownload) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.download = "";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function getMaterialUi(material: MaterialRow) {
  const type = (material.material_type ?? "").toUpperCase();
  const sourceKind = (material.source_kind ?? "LINK").toUpperCase();
  const resource = (material.resource_url ?? "").toLowerCase();
  const fileName = (material.original_file_name ?? "").toLowerCase();

  if (type === "PDF" || resource.endsWith(".pdf") || fileName.endsWith(".pdf")) {
    return {
      icon: FileText,
      iconBgClass: "bg-red-100",
      iconClass: "text-red-600",
      suggestDownload: true,
      defaultDescription: "Material em PDF para leitura e consulta apos a aula.",
    };
  }

  if (type === "ARQUIVO" || sourceKind === "UPLOAD") {
    return {
      icon: FileArchive,
      iconBgClass: "bg-emerald-100",
      iconClass: "text-emerald-700",
      suggestDownload: true,
      defaultDescription: "Arquivo complementar para download e uso durante os estudos.",
    };
  }

  if (type === "LINK") {
    return {
      icon: Link2,
      iconBgClass: "bg-sky-100",
      iconClass: "text-sky-700",
      suggestDownload: false,
      defaultDescription: "Link externo com referencia ou conteudo complementar.",
    };
  }

  return {
    icon: FileText,
    iconBgClass: "bg-slate-200",
    iconClass: "text-slate-700",
    suggestDownload: sourceKind === "UPLOAD",
    defaultDescription: "Recurso complementar associado a esta aula.",
  };
}
