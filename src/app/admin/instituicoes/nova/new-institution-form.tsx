"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { createInstitutionAction } from "@/app/actions/upsert-institution";
import {
  initialInstitutionFormState,
  type InstitutionFormState,
} from "@/app/actions/upsert-institution-state";
import { slugify } from "@/lib/courses/slugify";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-red-600">{errors[0]}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
    >
      {pending ? "Criando…" : "Criar instituição"}
    </button>
  );
}

export function NewInstitutionForm() {
  const [state, formAction] = useActionState<InstitutionFormState, FormData>(
    createInstitutionAction,
    initialInstitutionFormState,
  );
  const [nameValue, setNameValue] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const slugRef = useRef<HTMLInputElement>(null);
  const slugSuggestion = nameValue ? slugify(nameValue) : "";

  useEffect(() => {
    if (!slugTouched && slugRef.current && slugSuggestion) {
      slugRef.current.value = slugSuggestion;
    }
  }, [slugSuggestion, slugTouched]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        INSTITUIÇÃO
      </p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900">
        Detalhes da instituição
      </h2>

      <form action={formAction} className="mt-6 space-y-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">
            Nome da instituição *
          </span>
          <input
            type="text"
            name="name"
            required
            placeholder="Ex.: Colégio Marista"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <FieldError errors={state.fieldErrors?.name} />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Slug *</span>
          <input
            ref={slugRef}
            type="text"
            name="slug"
            required
            onChange={() => setSlugTouched(true)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <p className="text-xs text-slate-500">
            Use apenas letras minúsculas, números e hífens. Será gerado
            automaticamente a partir do nome — você pode editar antes de salvar.
          </p>
          {!slugTouched && slugSuggestion && (
            <p className="text-xs italic text-slate-400">
              Sugestão: {slugSuggestion}
            </p>
          )}
          <FieldError errors={state.fieldErrors?.slug} />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">
            Email do contato comercial
          </span>
          <input
            type="email"
            name="contact_email"
            placeholder="contato@exemplo.com.br"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <p className="text-xs text-slate-500">
            Email do contato comercial na instituição (não é o gestor da
            plataforma).
          </p>
          <FieldError errors={state.fieldErrors?.contact_email} />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">
            Telefone (opcional)
          </span>
          <input
            type="tel"
            name="contact_phone"
            placeholder="(00) 00000-0000"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <FieldError errors={state.fieldErrors?.contact_phone} />
        </label>

        {state.message ? (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg px-3 py-2 text-sm border ${
              state.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/instituicoes"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Cancelar
          </Link>
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
