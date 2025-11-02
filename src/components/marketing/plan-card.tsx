import type { PlanItem } from "@/lib/marketing/content";

type PlanCardProps = {
  plan: PlanItem;
  href: string;
  target?: string;
};

export function PlanCard({ plan, href, target }: PlanCardProps) {
  return (
    <article
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition ${
        plan.highlight ? "outline outline-2 outline-offset-4 outline-sky-400" : "hover:-translate-y-1 hover:shadow-md"
      }`}
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">{plan.sku}</span>
        <h3 className="text-2xl font-semibold text-slate-900">{plan.name}</h3>
        <p className="text-sm text-slate-600">{plan.description}</p>
      </div>

      <div className="mt-6 flex flex-col gap-1 border-t border-dashed border-slate-200 pt-4 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{plan.idealFor}</span>
        <span className="text-lg font-semibold text-slate-900">{plan.price}</span>
      </div>

      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noreferrer" : undefined}
        className={`mt-auto inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          plan.highlight
            ? "bg-sky-600 text-white hover:bg-sky-700 focus-visible:outline-sky-600"
            : "border border-slate-300 text-slate-900 hover:border-sky-400 hover:text-sky-800 focus-visible:outline-sky-600"
        }`}
      >
        {plan.ctaLabel}
      </a>
    </article>
  );
}
