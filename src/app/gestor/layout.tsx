import { LogoutButton } from "@/components/auth/logout-button";

export default function GestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-slate-900">Gestão de Incidentes</span>
            <span className="text-xs text-slate-500">Painel da instituição</span>
          </div>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
