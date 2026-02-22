import type { CourseWithContent } from "@/lib/courses/types";

type CourseOverviewProps = {
  course: CourseWithContent;
};

export function CourseOverview({ course }: CourseOverviewProps) {
  const moduleCount = course.modules.length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Curso</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">{course.title}</h1>
      {course.description ? <p className="mt-4 text-base text-slate-600">{course.description}</p> : null}

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Modulos</dt>
          <dd className="text-2xl font-semibold text-slate-900">{moduleCount}</dd>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Aulas</dt>
          <dd className="text-2xl font-semibold text-slate-900">{course.totalLessons}</dd>
        </div>
      </dl>

      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-sm font-medium text-slate-700">
          <span>Progresso do curso</span>
          <span>{course.completionPercentage}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-sky-600 transition-all" style={{ width: `${course.completionPercentage}%` }} />
        </div>
        <p className="text-xs text-slate-500">
          {course.completedLessons} de {course.totalLessons} aulas concluidas
        </p>
      </div>
    </section>
  );
}
