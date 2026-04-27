"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PasswordFieldErrors = Partial<Record<"password" | "confirm_password", string>>;

function getUpdatePasswordErrorMessage(message: string | undefined) {
  const normalizedMessage = (message ?? "").toLowerCase();

  if (normalizedMessage.includes("weak_password") || normalizedMessage.includes("weak password")) {
    return "Escolha uma senha mais forte com pelo menos 8 caracteres.";
  }

  if (normalizedMessage.includes("at least") && normalizedMessage.includes("password")) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }

  if (normalizedMessage.includes("same password") || normalizedMessage.includes("different")) {
    return "Escolha uma senha diferente da anterior.";
  }

  if (normalizedMessage.includes("jwt") || normalizedMessage.includes("session")) {
    return "Link invalido ou expirado. Solicite um novo link.";
  }

  return "Não foi possivel definir a senha. Tente novamente.";
}

export function AcceptInviteForm() {
  const router = useRouter();
  const sessionResolvedRef = useRef(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let isMounted = true;
    const searchParams = new URLSearchParams(window.location.search);
    const tokenHash = searchParams.get("token_hash");
    const tokenType = searchParams.get("type");
    const hashParams = new URLSearchParams(window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "");
    const accessTokenFromHash = hashParams.get("access_token");
    const refreshTokenFromHash = hashParams.get("refresh_token");

    function resolveSession({
      sessionFound,
      message,
    }: {
      sessionFound: boolean;
      message?: string;
    }) {
      if (!isMounted || sessionResolvedRef.current) {
        return;
      }

      sessionResolvedRef.current = true;
      setHasSession(sessionFound);
      setSessionMessage(sessionFound ? "" : message ?? "");
      setIsCheckingSession(false);
    }

    const timeoutId = window.setTimeout(() => {
      resolveSession({
        sessionFound: false,
        message: "Não foi possível validar o link. Solicite um novo link.",
      });
    }, 7000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        clearTimeout(timeoutId);
        if (session) {
          resolveSession({ sessionFound: true });
        }
        return;
      }

      if (event === "INITIAL_SESSION") {
        if (session) {
          clearTimeout(timeoutId);
          resolveSession({ sessionFound: true });
        }
      }
    });

    async function bootstrapSessionValidation() {
      try {
        if (accessTokenFromHash && refreshTokenFromHash) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessTokenFromHash,
            refresh_token: refreshTokenFromHash,
          });

          if (!setSessionError) {
            if (window.location.hash) {
              window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
            }
            clearTimeout(timeoutId);
            resolveSession({ sessionFound: true });
            return;
          }
        }

        if (tokenHash && tokenType) {
          const allowedTypes: ReadonlySet<string> = new Set(["invite", "recovery", "magiclink", "email", "email_change"]);
          if (allowedTypes.has(tokenType)) {
            const { error: otpError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: tokenType as EmailOtpType,
            });

            if (otpError) {
              clearTimeout(timeoutId);
              resolveSession({
                sessionFound: false,
                message: "Link inválido ou expirado. Solicite um novo link.",
              });
              return;
            }
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }

        if (error) {
          clearTimeout(timeoutId);
          resolveSession({
            sessionFound: false,
            message: "Não foi possível validar o convite. Tente abrir o link novamente.",
          });
          return;
        }

        if (data.session) {
          clearTimeout(timeoutId);
          resolveSession({ sessionFound: true });
        }
      } catch {
        clearTimeout(timeoutId);
        resolveSession({
          sessionFound: false,
          message: "Não foi possível validar o convite. Tente novamente em alguns instantes.",
        });
      }
    }

    void bootstrapSessionValidation();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasSession) {
      setErrorMessage(sessionMessage || "Link invalido ou expirado.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    const nextFieldErrors: PasswordFieldErrors = {};

    if (password.length < 8) {
      nextFieldErrors.password = "Senha deve ter pelo menos 8 caracteres.";
    }

    if (confirmPassword !== password) {
      nextFieldErrors.confirm_password = "As senhas precisam ser iguais.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setErrorMessage("Revise os dados informados.");
      setSuccessMessage("");
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        console.error("Erro ao definir senha no aceite de convite", updateError);
        setErrorMessage(getUpdatePasswordErrorMessage(updateError.message));
        return;
      }

      setSuccessMessage("Senha definida com sucesso. Redirecionando para o login...");

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error("Falha ao encerrar sessao apos definir senha", signOutError);
      }

      router.push("/login?message=password-set");
      router.refresh();
    } catch (error) {
      console.error("Erro inesperado ao definir senha no aceite de convite", error);
      setErrorMessage("Não foi possível definir a senha. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Aceitar convite</h1>
        <p className="mt-2 text-sm text-slate-600">Validando link de convite...</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Convite indisponível</h1>
        <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {sessionMessage || "Link inválido ou expirado."}
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Ir para login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Definir senha</h1>
        <p className="text-sm text-slate-600">Crie sua senha para concluir o acesso.</p>
      </div>

      {errorMessage || successMessage ? (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            successMessage
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
          role="status"
          aria-live="polite"
        >
          {successMessage || errorMessage}
        </div>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Senha *</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Min. 8 caracteres"
          disabled={isSubmitting}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        {fieldErrors.password ? <p className="text-xs text-red-600">{fieldErrors.password}</p> : null}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Confirmar senha *</span>
        <input
          type="password"
          name="confirm_password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Repita a senha"
          disabled={isSubmitting}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        {fieldErrors.confirm_password ? <p className="text-xs text-red-600">{fieldErrors.confirm_password}</p> : null}
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Salvando..." : "Salvar senha"}
      </button>
    </form>
  );
}
