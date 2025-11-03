import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import type { PlanItem } from "@/lib/marketing/content";
import { landingContent } from "@/lib/marketing/content";
import { InstitutionalLeadForm } from "@/components/marketing/institutional-lead-form";
import { FaqItem } from "@/components/marketing/faq-item";
import { MarketingIcon } from "@/components/marketing/icon";
import { PlanCard } from "@/components/marketing/plan-card";
import { MarketingSection, SectionHeader } from "@/components/marketing/section";

function resolvePlanCta(plan: PlanItem) {
  const envValue = process.env[plan.checkoutEnvKey];

  if (envValue && envValue.trim().length > 0) {
    const target = envValue.startsWith("http") ? "_blank" : undefined;
    return { href: envValue, target };
  }

  if (plan.sku === "INSTITUCIONAL") {
    return { href: "#institucional" };
  }

  return { href: "#cta-final" };
}

export default function Home() {
  const {
    hero,
    audience,
    outcomes,
    workflow,
    curriculum,
    materials,
    testimonial,
    plans,
    guarantee,
    faq,
    finalCta,
    footer,
  } = landingContent;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(22,78,170,0.45),_transparent_55%),linear-gradient(120deg,_#020617,_#0b1c3d_55%,_#123b82)] text-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(15,118,255,0.35),_transparent_60%)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-10 sm:pt-12 lg:pt-16">
          <nav className="flex items-center justify-between">
            <span className="text-lg font-semibold tracking-tight">Gestão de Incidentes</span>
            <Link
              href="/login"
              className="rounded-full border border-white/30 px-4 py-1.5 text-sm font-medium text-slate-50 transition hover:border-white hover:bg-white/10"
            >
              Entrar
            </Link>
          </nav>
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr),minmax(0,420px)]">
            <div className="flex flex-col gap-8">
              <span className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-50">
                {hero.eyebrow}
              </span>
              <div className="space-y-6">
                <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  {hero.title}
                </h1>
                <p className="max-w-2xl text-lg text-slate-200">{hero.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href={hero.primaryCta.href}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
                >
                  {hero.primaryCta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href={hero.secondaryCta.href}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-slate-50 transition hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                >
                  {hero.secondaryCta.label}
                </a>
              </div>
              <dl className="grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
                {hero.trustBadges.map((badge) => (
                  <div key={badge} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                    {badge}
                  </div>
                ))}
              </dl>
            </div>
            <div className="relative -mb-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg backdrop-blur">
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-sky-200">Destaques do curso</span>
                  <p className="mt-2 text-lg font-semibold text-white">Transforme risco em segurança abrangente</p>
                  <p className="mt-2 text-sm text-slate-200">
                    Conteúdo gravado, modelos prontos e acompanhamento para implementar protocolos completos em poucos dias.
                  </p>
                </div>
                <ul className="space-y-3 text-sm text-slate-200">
                  {outcomes.items.slice(0, 3).map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-sky-300" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-slate-100">
                  <p className="font-semibold text-white">Mentoria com especialistas</p>
                  <p className="mt-1">
                    Hamilton Santos Esteves Jr. e Marcos de Alencar Dantas compartilham experiências reais em escolas do DF e redes privadas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col">
        <MarketingSection id={audience.id} background="default">
          <SectionHeader title={audience.title} subtitle={audience.description} />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {audience.items.map((item) => (
              <article
                key={item.title}
                className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
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

        <MarketingSection id={outcomes.id} background="muted">
          <SectionHeader
            eyebrow="Resultados"
            title={outcomes.title}
            subtitle="Aplicações imediata com protocolos validados e replicáveis."
            align="center"
          />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {outcomes.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-sky-600" aria-hidden="true" />
                <span className="text-sm text-slate-600">{item}</span>
              </li>
            ))}
          </ul>
        </MarketingSection>

        <MarketingSection id={workflow.id} background="default">
          <SectionHeader
            eyebrow="Metodologia"
            title={workflow.title}
            subtitle="Estrutura pensada para facilitar a implementações e a adoção por toda a comunidade escolar."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {workflow.steps.map((step) => (
              <article
                key={step.title}
                className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <MarketingIcon className="h-6 w-6" name={step.icon} />
                </span>
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 rounded-2xl border border-sky-200 bg-sky-50 px-6 py-5 text-sm font-medium text-sky-900">
            {workflow.highlight}
          </div>
        </MarketingSection>

        <MarketingSection id={curriculum.id} background="muted">
          <SectionHeader
            eyebrow="Conteúdo programado"
            title={curriculum.title}
            subtitle="Cada módulo evolui para o protocolo completo da sua escola."
          />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2">
            {curriculum.modules.map((module, index) => (
              <li
                key={module}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                <span className="mt-1 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-sm text-slate-700">{module}</span>
              </li>
            ))}
          </ol>
        </MarketingSection>

        <MarketingSection id={materials.id} background="default">
          <SectionHeader
            eyebrow="Bônus"
            title={materials.title}
            subtitle="Ferramentas prontas para acelerar a execução e o acompanhamento com sua equipe."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {materials.items.map((item) => (
              <article
                key={item.title}
                className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
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
          <SectionHeader tone="light" eyebrow="Prova social" title={testimonial.title} subtitle={testimonial.description} />
          <div className="mt-12 flex flex-col gap-10 lg:flex-row lg:items-start">
            <blockquote className="flex-1 rounded-2xl border border-white/20 bg-white/5 p-8 text-lg font-medium text-slate-50 shadow-lg">
              \u201c{testimonial.quote}\u201d
              <footer className="mt-6 text-sm font-normal text-slate-200">\u2014 {testimonial.author}</footer>
            </blockquote>
            <div className="flex flex-1 flex-col gap-6 rounded-2xl border border-white/20 bg-white/5 p-8 text-sm text-slate-100 shadow-lg">
              <p className="font-semibold text-white">Instituições onde a metodologia foi aplicada</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-6 text-center text-sm font-semibold uppercase tracking-wide text-slate-100">
                  Universidade de Brasília (UnB)
                </div>
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-6 text-center text-sm font-semibold uppercase tracking-wide text-slate-100">
                  Secretaria de Educação do DF
                </div>
              </div>
            </div>
          </div>
        </MarketingSection>

        <MarketingSection id={plans.id} background="default" className="pb-10">
          <SectionHeader title={plans.title} subtitle={plans.description} eyebrow="Planos" align="center" />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.items.map((plan) => {
              const cta = resolvePlanCta(plan);
              return <PlanCard key={plan.sku} plan={plan} href={cta.href} target={cta.target} />;
            })}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Precisa de uma proposta personalizada? Preencha o formulário institucional e nossa equipe retorna em até 24h úteis.
          </p>
        </MarketingSection>

        <MarketingSection id="institucional" background="muted">
          <SectionHeader
            eyebrow="Atendimento institucional"
            title="Converse com o time especialista e ajuste o plano à sua realidade."
            subtitle="Conte-nos sobre a sua escola para alinharmos licenças, condições de pagamento e personalizações dos protocolos."
          />
          <div className="mt-10">
            <InstitutionalLeadForm />
          </div>
        </MarketingSection>

        <MarketingSection id={guarantee.id} background="default">
          <SectionHeader
            eyebrow="Confiança"
            title={guarantee.title}
            subtitle="Suporte integral para garantir a adoção da metodologia na sua instituição"
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {guarantee.items.map((item) => (
              <article
                key={item.title}
                className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
              >
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <MarketingIcon className="h-6 w-6" name={item.icon} />
                </span>
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </MarketingSection>

        <MarketingSection id={faq.id} background="muted">
          <SectionHeader
            eyebrow="FAQ"
            title={faq.title}
            subtitle="Se a sua dúvida nãoo está aqui, envie uma mensagem para nosso time comercial."
          />
          <div className="mt-10 grid gap-4">
            {faq.items.map((item) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </MarketingSection>

        <section
          id={finalCta.id}
          className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 py-20 text-slate-50"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_70%)]" />
          <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{finalCta.title}</h2>
            <p className="text-base text-slate-200">{finalCta.subtitle}</p>
            <a
              href={finalCta.ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
            >
              {finalCta.ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-900 py-12 text-slate-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <span className="text-lg font-semibold">Gestão de Incidentes</span>
            <p className="max-w-sm text-sm text-slate-300">
              Curso online para transformar risco em segurança com protocolos prontos e suporte especializado.
            </p>
            <div className="space-y-1 text-sm text-slate-300">
              <p>Contato: {footer.contactEmail}</p>
              <p>WhatsApp: {footer.contactWhatsapp}</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">Formadores</p>
            <ul className="space-y-1">
              {footer.trainers.map((trainer) => (
                <li key={trainer}>{trainer}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">Recursos</p>
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
