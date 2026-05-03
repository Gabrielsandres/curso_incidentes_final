"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Loader2, Mail, Search, UserPlus } from "lucide-react";

import { attachInstitutionMemberAction } from "@/app/actions/attach-institution-member";
import { initialAttachMemberFormState } from "@/app/actions/attach-institution-member-state";
import { searchStudentsForInstitution } from "@/app/actions/search-students-for-institution";
import { callAdminUserFunction } from "@/lib/admin/call-admin-user-function";
import type {
  InstitutionMemberWithProfile,
  InstitutionRow,
} from "@/lib/institutions/types";

import { MemberRoleBadge } from "@/components/admin/member-role-badge";

import { DetachMemberButton } from "./detach-member-button";
import { PromoteManagerButton } from "./promote-manager-button";

type Tab = "list" | "invite";
type SearchResult = { id: string; fullName: string; email: string };

interface Props {
  institution: InstitutionRow;
  members: InstitutionMemberWithProfile[];
}

export function InstitutionManager({ institution, members }: Props) {
  const [tab, setTab] = useState<Tab>("list");

  // ---------- Add-existing tab ----------
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (search.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchStudentsForInstitution(institution.id, search);
      setResults(res);
      setIsSearching(false);
    }, 250);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, institution.id]);

  const [, startAttachTransition] = useTransition();
  const [attachState, attachAction, isAttachPending] = useActionState(
    attachInstitutionMemberAction,
    initialAttachMemberFormState,
  );

  function handleAttach(profileId: string) {
    const fd = new FormData();
    fd.set("institution_id", institution.id);
    fd.set("profile_id", profileId);
    fd.set("institution_slug", institution.slug);
    startAttachTransition(() => {
      attachAction(fd);
    });
  }

  // ---------- Invite tab ----------
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsInviting(true);
    setInviteSuccess(null);
    setInviteError(null);

    try {
      const result = await callAdminUserFunction({
        action: "invite",
        email: inviteEmail.trim(),
        full_name: inviteName.trim(),
        institution_id: institution.id,
      });

      // CRITICAL (B-1 fix): callAdminUserFunction success branch returns
      //   { ok: true, data: unknown }
      // — there is NO `.message` property on the success type. Reading
      // `result.message` on the success path would fail `npm run typecheck`.
      // Mirror the narrowing pattern already proven at
      // src/app/admin/usuarios/user-manager.tsx:64-72: pull `message` out of
      // result.data via runtime type guards.
      if (!result.ok) {
        setInviteError(result.message);
        return;
      }
      const responseMessage =
        typeof result.data === "object" &&
        result.data !== null &&
        "message" in result.data &&
        typeof (result.data as Record<string, unknown>).message === "string"
          ? ((result.data as Record<string, unknown>).message as string)
          : `Convite enviado para ${inviteEmail} da instituição ${institution.name}.`;
      setInviteSuccess(responseMessage);
      setInviteName("");
      setInviteEmail("");
    } catch {
      setInviteError(
        "Não foi possível enviar o convite. Tente novamente em alguns instantes.",
      );
    } finally {
      setIsInviting(false);
    }
  }

  // ---------- Members rendering ----------
  const currentManager = members.find((m) => m.role === "manager");
  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR")),
    [members],
  );

  return (
    <div className="space-y-6">
      {/* Add member sub-card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            MEMBROS
          </p>
          <h2 className="text-xl font-semibold text-slate-900">
            Alunos vinculados
          </h2>
          <p className="text-sm text-slate-600">
            Adicione alunos existentes ou convide novos para vincular à
            instituição. Vincular aqui não matricula em cursos — matrículas são
            feitas em <strong>Catálogo &gt; Curso &gt; Alunos</strong>.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {(["list", "invite"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-1 pb-3 pt-3 text-sm font-medium transition ${
                tab === t
                  ? "border-sky-600 text-sky-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              } ${t === "invite" ? "ml-6" : ""}`}
            >
              {t === "list" ? "Adicionar aluno existente" : "Convidar novo aluno"}
            </button>
          ))}
        </div>

        {/* Add-existing pane */}
        {tab === "list" && (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                placeholder="Buscar por nome ou email…"
                className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              {isSearching && (
                <Loader2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                  aria-hidden="true"
                />
              )}
            </div>
            {search.trim().length < 2 ? (
              <p className="text-sm text-slate-500">
                Comece a digitar o nome ou email do aluno.
              </p>
            ) : results.length === 0 && !isSearching ? (
              <p className="text-sm text-slate-500">
                Nenhum aluno encontrado com esse termo. Talvez seja preciso
                convidá-lo abaixo.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100" role="list">
                {results.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {s.fullName}
                      </p>
                      <p className="truncate text-xs text-slate-500">{s.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAttach(s.id)}
                      disabled={isAttachPending}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isAttachPending ? (
                        <>
                          <Loader2
                            size={14}
                            className="animate-spin"
                            aria-hidden="true"
                          />
                          Adicionando…
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} aria-hidden="true" />
                          Adicionar aluno
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {attachState.message ? (
              <div
                role="status"
                aria-live="polite"
                className={`rounded-lg px-3 py-2 text-sm border ${
                  attachState.success
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {attachState.message}
              </div>
            ) : null}
          </div>
        )}

        {/* Invite pane */}
        {tab === "invite" && (
          <form onSubmit={handleInvite} className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">
              Enviaremos um email de convite mencionando{" "}
              <strong>{institution.name}</strong>. O aluno define a própria senha
              ao aceitar.
            </p>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Nome completo *
              </span>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
                placeholder="Ex.: Maria Silva"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Email *</span>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="aluno@exemplo.com.br"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <button
              type="submit"
              disabled={isInviting}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isInviting ? (
                <>
                  <Loader2
                    size={14}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  Enviando convite…
                </>
              ) : (
                <>
                  <Mail size={14} aria-hidden="true" />
                  Convidar novo aluno
                </>
              )}
            </button>
            {inviteError ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {inviteError}
              </div>
            ) : null}
            {inviteSuccess ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              >
                {inviteSuccess}
              </div>
            ) : null}
          </form>
        )}
      </section>

      {/* Members list sub-card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            EQUIPE
          </p>
          <h2 className="text-xl font-semibold text-slate-900">
            {members.length}{" "}
            {members.length === 1 ? "aluno vinculado" : "alunos vinculados"}
          </h2>
        </div>
        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm font-semibold text-slate-700">
              Nenhum aluno vinculado ainda.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Use os formulários acima para adicionar alunos existentes ou
              convidar novos.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sortedMembers.map((m) => {
              const isCurrentManager = m.role === "manager";
              const promoteMode:
                | "promote-no-prior"
                | "promote-with-prior"
                | "demote" = isCurrentManager
                ? "demote"
                : currentManager
                  ? "promote-with-prior"
                  : "promote-no-prior";

              return (
                <li
                  key={m.profileId}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {m.fullName}
                      </span>
                      <MemberRoleBadge role={m.role} />
                    </div>
                    <p className="truncate text-xs text-slate-500">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PromoteManagerButton
                      institutionId={institution.id}
                      institutionSlug={institution.slug}
                      institutionName={institution.name}
                      profileId={m.profileId}
                      fullName={m.fullName}
                      mode={promoteMode}
                      priorManagerName={currentManager?.fullName}
                    />
                    <DetachMemberButton
                      institutionId={institution.id}
                      institutionSlug={institution.slug}
                      profileId={m.profileId}
                      fullName={m.fullName}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
