"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-800">
        <h1 className="text-2xl font-semibold">Ocorreu um erro inesperado</h1>
        <p className="mt-2 text-sm text-slate-600">Nosso time já foi notificado. Tente novamente ou retorne para a página inicial.</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Tentar novamente
          </button>
          <Link
            href="/"
            className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky-300"
          >
            Voltar para início
          </Link>
        </div>
        {error.digest ? <p className="mt-4 text-xs text-slate-400">Código: {error.digest}</p> : null}
      </body>
    </html>
  );
}
