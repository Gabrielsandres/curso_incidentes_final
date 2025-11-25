import { Paperclip } from "lucide-react";

import type { MaterialRow } from "@/lib/courses/types";

type LessonMaterialsProps = {
  materials: MaterialRow[];
};

export function LessonMaterials({ materials }: LessonMaterialsProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Materiais</p>
        <h2 className="text-xl font-semibold text-slate-900">Recursos complementares</h2>
      </header>

      {materials.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum material foi adicionado para esta aula.</p>
      ) : (
        <ul className="space-y-3">
          {materials.map((material) => (
            <li
              key={material.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{material.label}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">{material.material_type}</p>
              </div>
              <a
                href={material.resource_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-white"
              >
                <Paperclip className="h-4 w-4" aria-hidden="true" />
                Abrir
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
