import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar | Gestao de Incidentes",
};

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const raw = Array.isArray(params.redirectTo) ? params.redirectTo[0] : params.redirectTo;
  const redirectTo = typeof raw === "string" ? raw : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-semibold text-slate-900">
            Gestao de Incidentes
          </Link>
          <span className="text-sm text-slate-500">Plataforma &amp; LP</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <LoginForm redirectTo={redirectTo} />
      </main>
    </div>
  );
}
