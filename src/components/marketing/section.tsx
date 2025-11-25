import type { ReactNode } from "react";

type MarketingSectionProps = {
  id?: string;
  background?: "default" | "muted" | "accent" | "dark";
  children: ReactNode;
  className?: string;
};

const backgroundClassNames: Record<NonNullable<MarketingSectionProps["background"]>, string> = {
  default: "bg-white text-slate-900",
  muted: "bg-[#030b1f] text-white",
  accent: "bg-gradient-to-br from-[#04122c] via-[#030b1f] to-[#010512] text-white",
  dark: "bg-[#010512] text-white",
};

export function MarketingSection({ id, background = "default", children, className }: MarketingSectionProps) {
  return (
    <section id={id} className={backgroundClassNames[background]}>
      <div className={`mx-auto w-full max-w-6xl px-6 py-20 sm:py-24 ${className ?? ""}`.trim()}>{children}</div>
    </section>
  );
}

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  align?: "left" | "center";
  tone?: "default" | "light";
};

export function SectionHeader({ title, subtitle, eyebrow, align = "left", tone = "default" }: SectionHeaderProps) {
  const isCenter = align === "center";
  const isLight = tone === "light";
  const baseTextColor = isLight ? "text-white" : "text-slate-900";
  const subtitleColor = isLight ? "text-slate-200" : "text-slate-600";
  const pillClasses = isLight
    ? "border border-white/25 bg-white/10 text-white"
    : "bg-[var(--accent-pill)] text-[#0f172a]";

  return (
    <div
      className={`mx-auto flex w-full max-w-3xl flex-col gap-4 ${isCenter ? "items-center text-center" : ""} ${
        isLight ? "text-white" : "text-slate-900"
      }`}
    >
      {eyebrow ? (
        <span
          className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-[0.75rem] font-semibold uppercase tracking-[0.12em] ${pillClasses}`}
        >
          {eyebrow}
        </span>
      ) : null}
      <h2 className={`text-[2.4rem] font-bold leading-[1.2] tracking-tight ${baseTextColor}`}>{title}</h2>
      {subtitle ? <p className={`max-w-3xl text-lg leading-relaxed ${subtitleColor}`}>{subtitle}</p> : null}
    </div>
  );
}
