import type { ReactNode } from "react";

type MarketingSectionProps = {
  id?: string;
  background?: "default" | "muted" | "accent" | "dark";
  children: ReactNode;
  className?: string;
};

const backgroundClassNames: Record<NonNullable<MarketingSectionProps["background"]>, string> = {
  default: "bg-[var(--surface-page)]",
  muted: "bg-[var(--surface-muted)]",
  accent: "bg-[var(--surface-contrast)] text-slate-50",
  dark: "bg-slate-900 text-slate-50",
};

export function MarketingSection({ id, background = "default", children, className }: MarketingSectionProps) {
  return (
    <section
      id={id}
      className={`${backgroundClassNames[background]} ${background === "default" ? "text-slate-900" : ""}`}
    >
      <div className={`mx-auto w-full max-w-6xl px-6 py-16 sm:py-20 ${className ?? ""}`.trim()}>{children}</div>
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
  return (
    <div
      className={`mx-auto flex max-w-3xl flex-col gap-3 ${align === "center" ? "text-center" : ""} ${
        tone === "light" ? "text-slate-100" : "text-slate-900"
      }`}
    >
      {eyebrow ? (
        <span
          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            tone === "light"
              ? "border border-white/30 bg-white/10 text-slate-50"
              : "border border-sky-300 bg-sky-50 text-sky-800"
          }`}
        >
          {eyebrow}
        </span>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle ? (
        <p className={`text-base ${tone === "light" ? "text-slate-200" : "text-slate-600"}`}>{subtitle}</p>
      ) : null}
    </div>
  );
}
