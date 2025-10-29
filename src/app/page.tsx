import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-base font-semibold text-slate-900">Gestão de Incidentes</span>
          <Link href="/login" className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700">
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-6 px-6 py-16">
        <span className="inline-flex w-fit items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
          Plataforma &amp; LP
        </span>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Projeto Gestão de Incidentes – Escola Segura</h1>
        <p className="max-w-2xl text-base text-slate-600">
          Ambiente em construção contendo landing page comercial, plataforma de cursos, dashboards para alunos e módulo administrativo.
          Esta etapa estabelece as fundações do projeto: autenticação, integrações e infraestrutura.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/login"
            className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Acessar plataforma
          </Link>
          <Link
            href="https://supabase.com/docs/guides/auth"
            className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-sky-700 hover:underline"
          >
            Documentação de autenticação
          </Link>
        </div>
      </main>
    </div>
  );
}
