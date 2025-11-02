"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  initialInstitutionalLeadState,
  submitInstitutionalLead,
  type InstitutionalLeadFormState,
} from "@/app/actions/create-institutional-lead";

const headcountOptions = [
  { label: "At\u00e9 200 estudantes", value: "200" },
  { label: "200 a 500 estudantes", value: "500" },
  { label: "500 a 1000 estudantes", value: "1000" },
  { label: "Mais de 1000 estudantes", value: "1200" },
];

const fieldLabels: Record<string, string> = {
  organization: "Institui\u00e7\u00e3o ou rede",
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

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg"
      aria-describedby="institutional-form-feedback"
    >
      <div className="space-y-2">
        <p className="text-sm text-slate-600">
          Preencha o formul\u00e1rio com os dados da sua escola ou rede. Nosso time retornar\u00e1 em at\u00e9 24 horas
          \u00fateis com uma proposta alinhada \u00e0s suas necessidades.
        </p>
      </div>

      {state.message ? (
        <div
          id="institutional-form-feedback"
          role="status"
          className={`rounded-lg px-4 py-3 text-sm ${
            state.success
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="organization" className="text-sm font-medium text-slate-700">
            {fieldLabels.organization}
          </label>
          <input
            id="organization"
            name="organization"
            type="text"
            required
            disabled={isPending}
            aria-invalid={Boolean(getFieldError(state, "organization"))}
            className={`rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 ${
              getFieldError(state, "organization") ? "border-red-300" : "border-slate-300"
            }`}
            placeholder="Escola Exemplo / Rede ABC"
          />
          {getFieldError(state, "organization") ? (
            <p className="text-xs text-red-600">{getFieldError(state, "organization")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="contactName" className="text-sm font-medium text-slate-700">
            {fieldLabels.contactName}
          </label>
          <input
            id="contactName"
            name="contactName"
            type="text"
            required
            disabled={isPending}
            aria-invalid={Boolean(getFieldError(state, "contactName"))}
            className={`rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 ${
              getFieldError(state, "contactName") ? "border-red-300" : "border-slate-300"
            }`}
            placeholder="Nome completo"
          />
          {getFieldError(state, "contactName") ? (
            <p className="text-xs text-red-600">{getFieldError(state, "contactName")}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
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
            className={`rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 ${
              getFieldError(state, "email") ? "border-red-300" : "border-slate-300"
            }`}
            placeholder="contato@escola.com"
          />
          {getFieldError(state, "email") ? (
            <p className="text-xs text-red-600">{getFieldError(state, "email")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className="text-sm font-medium text-slate-700">
            {fieldLabels.phone} <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            disabled={isPending}
            aria-invalid={Boolean(getFieldError(state, "phone"))}
            className={`rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 ${
              getFieldError(state, "phone") ? "border-red-300" : "border-slate-300"
            }`}
            placeholder="(61) 99999-0000"
          />
          {getFieldError(state, "phone") ? (
            <p className="text-xs text-red-600">{getFieldError(state, "phone")}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="headcount" className="text-sm font-medium text-slate-700">
            {fieldLabels.headcount} <span className="font-normal text-slate-400">(estimativa)</span>
          </label>
          <select
            id="headcount"
            name="headcount"
            defaultValue=""
            disabled={isPending}
            aria-invalid={Boolean(getFieldError(state, "headcount"))}
            className={`rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 ${
              getFieldError(state, "headcount") ? "border-red-300" : "border-slate-300"
            }`}
          >
            <option value="">Selecione uma faixa</option>
            {headcountOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {getFieldError(state, "headcount") ? (
            <p className="text-xs text-red-600">{getFieldError(state, "headcount")}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="message" className="text-sm font-medium text-slate-700">
            {fieldLabels.message} <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            disabled={isPending}
            aria-invalid={Boolean(getFieldError(state, "message"))}
            className="min-h-[120px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="Conte como est\u00e1 a estrutura atual ou objetivos que deseja alcan\u00e7ar."
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Como funciona o atendimento?</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Retorno por e-mail ou WhatsApp em at\u00e9 24 horas \u00fateis.</li>
          <li>Apresenta\u00e7\u00e3o do plano ideal para o porte e necessidade da institui\u00e7\u00e3o.</li>
          <li>Envio de proposta formal e agenda para reuni\u00e3o de alinhamento.</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Enviando..." : state.success ? "Recebido" : "Enviar informa\u00e7\u00f5es"}
      </button>
    </form>
  );
}
