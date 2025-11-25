import type { PlanItem } from "@/lib/marketing/content";

type PlanCardProps = {
  plan: PlanItem;
  href: string;
  target?: string;
};

export function PlanCard({ plan, href, target }: PlanCardProps) {
  const isHighlight = plan.highlight;
  const cardClasses = isHighlight
    ? "border-transparent bg-gradient-to-b from-[#102a5c] via-[#081634] to-[#030816] text-white shadow-[0_30px_65px_rgba(5,17,39,0.45)]"
    : "border-slate-100 bg-white text-slate-900 shadow-[0_25px_55px_rgba(15,23,42,0.08)]";
  const metaText = isHighlight ? "text-white/80" : "text-slate-600";
  const dividerClasses = isHighlight ? "border-white/20" : "border-slate-200";
  const skuColor = isHighlight ? "text-[#b5d4ff]" : "text-[#1f3b8f]";
  const ctaClasses = isHighlight
    ? "bg-[#1669d8] text-white hover:bg-[#1b73eb] focus-visible:outline-[#47a3ff]"
    : "border border-slate-200 text-slate-900 hover:border-[#1d4ed8] hover:text-[#1d4ed8] focus-visible:outline-[#1d4ed8]";

  return (
    <article
      className={`flex h-full flex-col gap-6 rounded-[28px] border p-6 transition ${cardClasses} ${
        isHighlight ? "" : "hover:-translate-y-1"
      }`}
    >
      <div className="flex flex-col gap-2">
        <span className={`text-xs font-semibold uppercase tracking-[0.3em] ${skuColor}`}>{plan.sku}</span>
        <h3 className="text-2xl font-semibold">{plan.name}</h3>
        <p className={`text-sm ${metaText}`}>{plan.description}</p>
      </div>

      <div className={`mt-2 flex flex-col gap-1 border-t ${dividerClasses} pt-4 text-sm ${metaText}`}>
        <span className={`font-semibold ${isHighlight ? "text-white" : "text-slate-900"}`}>{plan.idealFor}</span>
        <span className={`text-xl font-semibold ${isHighlight ? "text-white" : "text-slate-900"}`}>{plan.price}</span>
      </div>

      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noreferrer" : undefined}
        className={`mt-auto inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${ctaClasses}`}
      >
        {plan.ctaLabel}
      </a>
    </article>
  );
}
