import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Esqueci minha senha | Gestao de Incidentes",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-semibold text-slate-900">
            Gestao de Incidentes
          </Link>
          <span className="text-sm text-slate-500">Recuperacao de senha</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <ForgotPasswordForm />
      </main>
    </div>
  );
}
