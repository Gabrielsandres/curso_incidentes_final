import type { Metadata } from "next";
import Link from "next/link";

import { AcceptInviteForm } from "./accept-invite-form";

export const metadata: Metadata = {
  title: "Aceitar convite | Gestao de Incidentes",
};

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-semibold text-slate-900">
            Gestão de Incidentes
          </Link>
          <span className="text-sm text-slate-500">Aceite de convite</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <AcceptInviteForm />
      </main>
    </div>
  );
}
