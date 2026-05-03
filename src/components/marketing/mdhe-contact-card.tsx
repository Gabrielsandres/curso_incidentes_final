import { Mail, Phone } from "lucide-react";

/**
 * Inline contact card surfaced in /gestor empty state (0 alunos vinculados — D-13)
 * and any other future "talk to MDHE" CTA.
 *
 * NOTE: The exact email/WhatsApp values are placeholders. UI-SPEC §MDHE contact card
 * line 220 flagged this as TODO for the project owner. v1 ships with the placeholders;
 * production swap happens via a single edit here when the client confirms.
 */
export function MdheContactCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-700">Fale com a MDHE Consultoria</p>
      <p className="mt-1 text-sm text-slate-500">
        Para vincular sua equipe à plataforma, entre em contato:
      </p>
      <ul className="mt-4 space-y-2">
        <li className="flex items-center gap-2 text-sm text-slate-700">
          <Mail size={14} className="text-slate-400" aria-hidden="true" />
          <a
            href="mailto:contato@mdhe.com.br"
            className="text-sky-700 hover:text-sky-800 transition"
          >
            contato@mdhe.com.br
          </a>
        </li>
        <li className="flex items-center gap-2 text-sm text-slate-700">
          <Phone size={14} className="text-slate-400" aria-hidden="true" />
          <a
            href="https://wa.me/5561999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-700 hover:text-sky-800 transition"
          >
            (61) 99999-9999 (WhatsApp)
          </a>
        </li>
      </ul>
      <p className="mt-3 text-xs text-slate-400">
        Os contatos acima são placeholders e serão atualizados antes do release.
      </p>
    </div>
  );
}
