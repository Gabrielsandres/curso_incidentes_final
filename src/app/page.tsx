import Image from "next/image";
import { ArrowRight, CheckCircle2, ShieldCheck, University } from "lucide-react";

import type { PlanItem } from "@/lib/marketing/content";
import { landingContent } from "@/lib/marketing/content";
import { StickyNavbar } from "@/components/marketing/navbar";
import { InstitutionalLeadForm } from "@/components/marketing/institutional-lead-form";
import { FaqAccordion } from "@/components/marketing/faq-item";
import { MarketingIcon } from "@/components/marketing/icon";
import { PlanCard } from "@/components/marketing/plan-card";
import { MarketingSection, SectionHeader } from "@/components/marketing/section";

const heroBadgeIconMap = {
  "check-circle": CheckCircle2,
  "shield-check": ShieldCheck,
  university: University,
} as const;

const navigationItems = [
  { label: "Resultados", href: "#resultados" },
  { label: "Metodologia", href: "#metodologia" },
  { label: "Conteúdo programado", href: "#conteudo-programado" },
  { label: "Bônus", href: "#bonus" },
  { label: "Prova social", href: "#prova-social" },
  { label: "Planos", href: "#planos" },
  { label: "Atendimento institucional", href: "#atendimento-institucional" },
  { label: "Confiança", href: "#confianca" },
  { label: "FAQ", href: "#faq" },
] as const;

function resolvePlanCta(plan: PlanItem) {
  const envValue = process.env[plan.checkoutEnvKey];

  if (envValue && envValue.trim().length > 0) {
    const target = envValue.startsWith("http") ? "_blank" : undefined;
    return { href: envValue, target };
  }

  if (plan.sku === "INSTITUCIONAL") {
    return { href: "#atendimento-institucional" };
  }

  return { href: "#cta-final" };
}

export default function Home() {
  const {
    hero,
    audience,
    outcomes,
    methodology,
    curriculum,
    bonus,
    testimonial,
    plans,
    institutional,
    guarantee,
    faq,
    finalCta,
    footer,
  } = landingContent;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-page)] text-slate-900">
      <StickyNavbar items={navigationItems} ctaHref="#planos" ctaLabel="Quero garantir minha vaga" />

      <main className="flex flex-col">
        <section
          id="hero"
          className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(71,163,255,0.25),_transparent_65%),linear-gradient(135deg,_#020617,_#08132c_50%,_#102048)] pt-28 pb-24 text-white"
        >
          <div className="absolute inset-0 opacity-60">
            <div className="absolute -left-10 top-0 h-72 w-72 rounded-full bg-[#1669d8]/30 blur-[160px]" />
            <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-[#47a3ff]/20 blur-[160px]" />
          </div>
          <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-[minmax(0,1fr),420px]">
            <div className="space-y-8">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#47a3ff]">Curso online • aulas gravadas</p>
              <div className="space-y-6">
                <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-[3.3rem]">{hero.title}</h1>
                <p className="max-w-2xl text-lg text-white/80">{hero.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <a
                  href={hero.primaryCta.href}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1669d8] px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(22,105,216,0.45)] transition hover:bg-[#1b73eb]"
                >
                  {hero.primaryCta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href={hero.secondaryCta.href}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white/90 transition hover:border-white hover:bg-white/10"
                >
                  {hero.secondaryCta.label}
                </a>
              </div>
              <dl className="grid gap-4 text-sm text-white/90 sm:grid-cols-3">
                {hero.badges.map((badge) => {
                  const Icon = heroBadgeIconMap[badge.icon as keyof typeof heroBadgeIconMap];
                  return (
                    <div
                      key={badge.label}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
                    >
                      {Icon ? <Icon className="h-4 w-4 text-[#47a3ff]" aria-hidden="true" /> : null}
                      <span>{badge.label}</span>
                    </div>
                  );
                })}
              </dl>
              <p className="text-sm text-white/80">{hero.helper}</p>
            </div>
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_35px_80px_rgba(2,6,23,0.75)] backdrop-blur">
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#47a3ff]">Protocolos validados</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">Implemente um SGI completo</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    Videoaulas gravadas, modelos editáveis e suporte humano para colocar a metodologia em campo.
                  </p>
                </div>
                <ul className="space-y-4">
                  {outcomes.cards.slice(0, 3).map((card) => (
                    <li key={card.title} className="flex gap-3">
                      <CheckCircle2 className="mt-1 h-4 w-4 flex-none text-[#47a3ff]" aria-hidden="true" />
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-white">{card.title}</p>
                        <p className="text-white/80">{card.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="rounded-2xl border border-white/10 bg-[#0b1328]/80 p-4 text-sm text-white/80">
                  <p className="font-semibold text-white">Acesso vitalício + certificado 60h</p>
                  <p>Use os materiais sempre que precisar e envolva toda a comunidade escolar com segurança.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <MarketingSection id={audience.id}>
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#1f3b8f]">PARA QUEM É</p>
            <h2 className="text-[1.75rem] font-semibold text-slate-900">{audience.title}</h2>
            <p className="max-w-3xl text-lg text-slate-600">{audience.subtitle}</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {audience.cards.map((card) => (
              <article
                key={card.title}
                className="flex h-full flex-col gap-4 rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_25px_55px_rgba(15,23,42,0.08)] transition hover:-translate-y-1"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5edff] text-[#1d4ed8]">
                  <MarketingIcon className="h-6 w-6" name={card.icon} />
                </span>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                  <p className="text-sm text-slate-600">{card.description}</p>
                </div>
              </article>
            ))}
          </div>
        </MarketingSection>

        <MarketingSection id={outcomes.id} background="muted">
          <SectionHeader
            tone="light"
            eyebrow={outcomes.header.pill}
            title={outcomes.header.title}
            subtitle={outcomes.header.subtitle}
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {outcomes.cards.map((card) => (
              <article
                key={card.title}
                className="flex h-full flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.6)]"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(71,163,255,0.12)] text-[#47a3ff]">
                  <MarketingIcon className="h-6 w-6" name={card.icon} />
                </span>
                <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                <p className="text-sm text-white/80">{card.description}</p>
              </article>
            ))}
          </div>
        </MarketingSection>

        <MarketingSection id={methodology.id}>
          <SectionHeader
            eyebrow={methodology.header.pill}
            title={methodology.header.title}
            subtitle={methodology.header.subtitle}
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {methodology.steps.map((step) => (
              <article
                key={step.title}
                className="flex h-full flex-col gap-4 rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_25px_55px_rgba(15,23,42,0.08)]"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5edff] text-[#1d4ed8]">
                  <MarketingIcon className="h-6 w-6" name={step.icon} />
                </span>
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 rounded-[24px] border border-slate-200 bg-[#eef2ff] px-6 py-5 text-sm font-medium text-slate-900 shadow-[0_25px_55px_rgba(15,23,42,0.05)]">
            {methodology.footnote}
          </div>
        </MarketingSection>

        <MarketingSection id={curriculum.id} background="muted">
          <SectionHeader
            tone="light"
            eyebrow={curriculum.header.pill}
            title={curriculum.header.title}
            subtitle={curriculum.header.subtitle}
          />
          <ol className="mt-12 grid gap-4 md:grid-cols-2">
            {curriculum.modules.map((module, index) => (
              <li
                key={module}
                className="flex gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/80"
              >
                <span className="mt-1 inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#102048] text-base font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-base text-white">{module}</span>
              </li>
            ))}
          </ol>
        </MarketingSection>

        <MarketingSection id={bonus.id}>
          <SectionHeader eyebrow={bonus.header.pill} title={bonus.header.title} subtitle={bonus.header.subtitle} />
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {bonus.items.map((item) => (
              <article
                key={item.title}
                className="flex h-full flex-col gap-4 rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_25px_55px_rgba(15,23,42,0.08)]"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5edff] text-[#1d4ed8]">
                  <MarketingIcon className="h-6 w-6" name={item.icon} />
                </span>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </MarketingSection>

        <MarketingSection id={testimonial.id} background="accent">
          <SectionHeader
            tone="light"
            align="center"
            eyebrow={testimonial.header.pill}
            title={testimonial.header.title}
            subtitle={testimonial.header.subtitle}
          />
          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
            <blockquote className="rounded-[32px] border border-white/15 bg-white/10 p-8 text-lg leading-relaxed text-white shadow-[0_18px_45px_rgba(2,6,23,0.7)]">
              {testimonial.quote}
              <footer className="mt-6 text-sm font-medium text-[#c9d4e0]">{testimonial.author}</footer>
            </blockquote>
            <div className="rounded-[32px] border border-white/15 bg-white/5 p-8 shadow-[0_18px_45px_rgba(2,6,23,0.7)]">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#c9d4e0]">Instituições parceiras</p>
              <div className="mt-6 grid gap-4 text-center text-sm font-semibold uppercase tracking-wide text-white/80 sm:grid-cols-2">
                {testimonial.logos.map((logo) => (
                  <div key={logo} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-6">
                    {logo}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </MarketingSection>

        <MarketingSection id={plans.id}>
          <SectionHeader
            align="center"
            eyebrow={plans.header.pill}
            title={plans.header.title}
            subtitle={plans.header.subtitle}
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.items.map((plan) => {
              const cta = resolvePlanCta(plan);
              return <PlanCard key={plan.sku} plan={plan} href={cta.href} target={cta.target} />;
            })}
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">{plans.note}</p>
        </MarketingSection>

        <MarketingSection id={institutional.id} background="muted">
          <SectionHeader
            tone="light"
            eyebrow={institutional.header.pill}
            title={institutional.header.title}
            subtitle={institutional.header.subtitle}
          />
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.65fr),minmax(0,0.35fr)]">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_18px_45px_rgba(15,23,42,0.6)]">
              <InstitutionalLeadForm />
              <p className="mt-4 text-sm text-white/80">{institutional.footnote}</p>
            </div>
            <div className="rounded-[32px] border border-white/10 bg-gradient-to-b from-[#0b1f45] to-[#051027] p-8 text-sm text-white shadow-[0_18px_45px_rgba(15,23,42,0.6)]">
              <p className="text-base font-semibold text-white">O que acontece após o formulário?</p>
              <ul className="mt-4 space-y-3 text-white/80">
                <li>Retorno do time comercial em até 24h úteis.</li>
                <li>Alinhamento de licenças, customizações e condições contratuais.</li>
                <li>Definição de encontros presenciais apenas mediante contrato específico.</li>
              </ul>
            </div>
          </div>
        </MarketingSection>

        <MarketingSection id={guarantee.id}>
          <SectionHeader
            eyebrow={guarantee.header.pill}
            title={guarantee.header.title}
            subtitle={guarantee.header.subtitle}
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {guarantee.items.map((item) => (
              <article
                key={item.title}
                className="flex h-full flex-col gap-3 rounded-[24px] border border-slate-100 bg-white p-6 text-center shadow-[0_25px_55px_rgba(15,23,42,0.08)]"
              >
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5edff] text-[#1d4ed8]">
                  <MarketingIcon className="h-6 w-6" name={item.icon} />
                </span>
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </MarketingSection>

        <MarketingSection id={faq.id} background="muted">
          <SectionHeader tone="light" eyebrow={faq.header.pill} title={faq.header.title} subtitle={faq.header.subtitle} />
          <div className="mt-10">
            <FaqAccordion items={faq.items} />
          </div>
        </MarketingSection>

        <section
          id={finalCta.id}
          className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(71,163,255,0.25),_transparent_55%),linear-gradient(120deg,_#04122a,_#0d1f48)] py-20 text-white"
        >
          <div className="absolute inset-0 opacity-50">
            <div className="absolute left-10 top-5 h-48 w-48 rounded-full bg-[#1669d8]/40 blur-[160px]" />
          </div>
          <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#c9d4e0]">Último passo</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{finalCta.title}</h2>
            <p className="text-base text-white/80">{finalCta.subtitle}</p>
            <a
              href={finalCta.ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-[#1669d8] px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(22,105,216,0.45)] transition hover:bg-[#1b73eb]"
            >
              {finalCta.ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#010816] py-12 text-sm text-white/70">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 md:grid-cols-[minmax(0,1.2fr),repeat(2,minmax(0,0.4fr))]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image src="/Logo-removebg-preview.png" alt="Curso Gestão de Incidentes em Estabelecimentos de Ensino" width={150} height={40} />
              <p className="text-base font-semibold text-white">Gestão de Incidentes</p>
            </div>
            <p className="max-w-sm text-sm">
              Curso online para transformar risco em segurança com protocolos prontos, acompanhamento humano e materiais sempre atualizados.
            </p>
            <div className="space-y-1 text-sm">
              <p>
                Contato:{" "}
                <a className="text-white hover:underline" href={`mailto:${footer.contactEmail}`}>
                  {footer.contactEmail}
                </a>
              </p>
              <p>
                WhatsApp:{" "}
                <a className="text-white hover:underline" href={`https://wa.me/${footer.contactWhatsapp.replace(/\D/g, "")}`}>
                  {footer.contactWhatsapp}
                </a>
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-semibold text-white">Formadores</p>
            <ul className="space-y-1">
              {footer.trainers.map((trainer) => (
                <li key={trainer}>{trainer}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <p className="font-semibold text-white">Recursos</p>
            <ul className="space-y-2">
              {footer.links.map((link) => (
                <li key={link.label}>
                  <a className="hover:text-white" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
