import Link from "next/link";

import type { ModuleWithLessons } from "@/lib/courses/types";

type ModuleListProps = {
  modules: ModuleWithLessons[];
  courseSlug: string;
};

export function ModuleList({ modules, courseSlug }: ModuleListProps) {
  if (modules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
        Nenhum modulo cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {modules.map((module) => {
        const moduleTotalLessons = module.lessons.length;
        const moduleCompletedLessons = module.lessons.filter((lesson) => lesson.isCompleted).length;
        const modulePercentage =
          moduleTotalLessons > 0 ? Math.round((moduleCompletedLessons / moduleTotalLessons) * 100) : 0;

        return (
          <article key={module.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modulo {module.position}</p>
                <h2 className="text-xl font-semibold text-slate-900">{module.title}</h2>
                {module.description ? <p className="text-sm text-slate-600">{module.description}</p> : null}
              </div>
              <span className="text-xs font-medium text-slate-500">{module.lessons.length} aulas</span>
            </header>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Progresso do modulo</span>
                <span>{modulePercentage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-sky-600 transition-all" style={{ width: `${modulePercentage}%` }} />
              </div>
              <p className="text-xs text-slate-500">
                {moduleCompletedLessons}/{moduleTotalLessons} aulas concluidas
              </p>
            </div>

            {module.lessons.length > 0 ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aula {lesson.position}</p>
                      <p className="text-base font-medium text-slate-900">{lesson.title}</p>
                      {lesson.description ? <p className="text-sm text-slate-600">{lesson.description}</p> : null}
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          lesson.isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {lesson.isCompleted ? "Concluida" : "Pendente"}
                      </span>
                    </div>
                    <Link
                      href={`/curso/${courseSlug}/aula/${lesson.id}`}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-200 hover:bg-sky-50"
                    >
                      {lesson.isCompleted ? "Revisar aula" : "Assistir aula"}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Nenhuma aula cadastrada neste modulo ainda.</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
