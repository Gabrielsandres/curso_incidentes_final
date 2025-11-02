type FaqItemProps = {
  question: string;
  answer: string;
};

export function FaqItem({ question, answer }: FaqItemProps) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-slate-900">
        <span>{question}</span>
        <span className="text-slate-500 transition group-open:rotate-180">+</span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{answer}</p>
    </details>
  );
}
