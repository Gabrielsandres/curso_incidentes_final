"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  initialInstitutionalLeadState,
  submitInstitutionalLead,
  type InstitutionalLeadFormState,
} from "@/app/actions/create-institutional-lead";

const headcountOptions = [
  { label: "Até 200 estudantes", value: "200" },
  { label: "200 a 500 estudantes", value: "500" },
  { label: "500 a 1000 estudantes", value: "1000" },
  { label: "Mais de 1000 estudantes", value: "1200" },
];

const fieldLabels: Record<string, string> = {
  organization: "Instituição ou rede",
  contactName: "Nome do contato",
  email: "E-mail",
  phone: "Telefone ou WhatsApp",
  headcount: "Quantidade de estudantes",
  message: "Resumo da necessidade",
};

function getFieldError(state: InstitutionalLeadFormState, field: string) {
  return state.fieldErrors?.[field]?.[0];
}

export function InstitutionalLeadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(submitInstitutionalLead, initialInstitutionalLeadState);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  const baseInputClasses =
    "rounded-2xl border px-4 py-3 text-sm text-[#0f1c3d] outline-none transition placeholder:text-slate-400";

  const defaultInputClasses = `${baseInputClasses} border-[#d6e0fb] bg-white focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20`;
  const errorInputClasses = `${baseInputClasses} border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-300/40`;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-6 rounded-[28px] border border-[#e2e8ff] bg-white p-8 text-[#0f1c3d] shadow-[0_18px_45px_rgba(15,23,42,0.15)]"
      aria-describedby="institutional-form-feedback"
    >
      <div className="space-y-2 text-sm text-[#23407a]">
        <p>
          Preencha o formulário com os dados da sua escola ou rede. Nosso time retorna em até 24 horas úteis
          com uma proposta alinhada à sua necessidade.
        </p>
      </div>

      {state.message ? (
        <div
          id="institutional-form-feedback"
          role="status"
          className={`rounded-2xl px-4 py-3 text-sm ${
            state.success
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="organization" className="text-sm font-semibold text-[#0f1c3d]">
            {fieldLabels.organization}
          </label>
          <input
            id="organization"
            name="organization"
            type="text"
            required
            disabled={isPending}
            aria-invalid={Boolean(getFieldError(state, "organization"))}
            className={getFieldError(state, "organization") ? errorInputClasses : defaultInputClasses}
            placeholder="Escola Exemplo / Rede ABC"
          />
          {getFieldError(state, "organization") ? (
            <p className="text-xs text-rose-500">{getFieldError(state, "organization")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="contactName" className="text-sm font-semibold text-[#0f1c3d]">
            {fieldLabels.contactName}
          </label>
          <input
            id="contactName"
            name="contactName"
            type="text"
            required
            disabled={isPending}
            aria-invalid={Boolean(getFieldError(state, "contactName"))}
            className={getFieldError(state, "contactName") ? errorInputClasses : defaultInputClasses}
            placeholder="Nome completo"
          />
          {getFieldError(state, "contactName") ? (
            <p className="text-xs text-rose-500">{getFieldError(state, "contactName")}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold text-[#0f1c3d]">
            {fieldLabels.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={isPending}
            aria-invalid={Boolean(getFieldError(state, "email"))}
            className={getFieldError(state, "email") ? errorInputClasses : defaultInputClasses}
            placeholder="contato@escola.com"
          />
          {getFieldError(state, "email") ? (
            <p className="text-xs text-rose-500">{getFieldError(state, "email")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className="text-sm font-semibold text-[#0f1c3d]">
            {fieldLabels.phone} <span className="font-normal text-[#0f1c3d]/70">(opcional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            disabled={isPending}
            aria-invalid={Boolean(getFieldError(state, "phone"))}
            className={getFieldError(state, "phone") ? errorInputClasses : defaultInputClasses}
            placeholder="(61) 99999-0000"
          />
          {getFieldError(state, "phone") ? (
            <p className="text-xs text-rose-500">{getFieldError(state, "phone")}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="headcount" className="text-sm font-semibold text-[#0f1c3d]">
            {fieldLabels.headcount} <span className="font-normal text-[#0f1c3d]/70">(estimativa)</span>
          </label>
          <select
            id="headcount"
            name="headcount"
            defaultValue=""
            disabled={isPending}
            aria-invalid={Boolean(getFieldError(state, "headcount"))}
            className={`${getFieldError(state, "headcount") ? errorInputClasses : defaultInputClasses} pr-8`}
          >
            <option value="">Selecione uma faixa</option>
            {headcountOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-white text-[#0f1c3d]">
                {option.label}
              </option>
            ))}
          </select>
          {getFieldError(state, "headcount") ? (
            <p className="text-xs text-rose-500">{getFieldError(state, "headcount")}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="message" className="text-sm font-semibold text-[#0f1c3d]">
            {fieldLabels.message} <span className="font-normal text-[#0f1c3d]/70">(opcional)</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            disabled={isPending}
            aria-invalid={Boolean(getFieldError(state, "message"))}
            className="min-h-[140px] rounded-2xl border border-[#d6e0fb] bg-white px-4 py-3 text-sm text-[#0f1c3d] outline-none transition placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
            placeholder="Conte como está a estrutura atual e qual apoio precisa neste momento."
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#c7d8ff] bg-[#f4f7ff] p-4 text-sm text-[#1d3b6d]">
        <p className="font-semibold text-[#0f1c3d]">Como funciona o atendimento?</p>
        <ul className="space-y-1 pl-4 marker:text-[#1669d8]">
          <li className="list-disc">Retorno por e-mail ou WhatsApp em até 24 horas úteis.</li>
          <li className="list-disc">Plano recomendado de acordo com porte, regiões e necessidades específicas.</li>
          <li className="list-disc">Envio de proposta formal e agenda de alinhamento para próximos passos.</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#1669d8]/40 bg-[#e5efff] px-6 py-3 text-sm font-semibold text-[#0f1c3d] transition hover:bg-[#d6e8ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1669d8] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Enviando..." : state.success ? "Recebido" : "Enviar informações"}
      </button>
    </form>
  );
}
