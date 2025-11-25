"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type FaqEntry = {
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: ReadonlyArray<FaqEntry>;
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = activeIndex === index;
        return (
          <div
            key={item.question}
            className={`rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition ${
              isOpen ? "border-white/25 bg-white/[0.06]" : "hover:border-white/25 hover:bg-white/[0.05]"
            }`}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 text-left text-base font-semibold text-white"
              onClick={() => setActiveIndex(isOpen ? -1 : index)}
              aria-expanded={isOpen}
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`h-5 w-5 text-[#47a3ff] transition ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            <div
              className={`grid transition-all duration-200 ease-out ${
                isOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden text-sm leading-relaxed text-white/80">{item.answer}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
