"use client";

import { useFormStatus } from "react-dom";
import { ChevronUp, ChevronDown } from "lucide-react";

const iconButtonClass =
  "inline-flex items-center justify-center rounded min-h-[44px] min-w-[44px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-70 disabled:cursor-not-allowed";

function UpButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      aria-label="Mover para cima"
      className={iconButtonClass}
    >
      <ChevronUp size={16} aria-hidden="true" />
    </button>
  );
}

function DownButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      aria-label="Mover para baixo"
      className={iconButtonClass}
    >
      <ChevronDown size={16} aria-hidden="true" />
    </button>
  );
}

export interface ReorderButtonsProps {
  id: string;
  isFirst: boolean;
  isLast: boolean;
  upAction: (fd: FormData) => void | Promise<void>;
  downAction: (fd: FormData) => void | Promise<void>;
}

export function ReorderButtons({ id, isFirst, isLast, upAction, downAction }: ReorderButtonsProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <form action={upAction}>
        <input type="hidden" name="id" value={id} />
        <UpButton disabled={isFirst} />
      </form>
      <form action={downAction}>
        <input type="hidden" name="id" value={id} />
        <DownButton disabled={isLast} />
      </form>
    </div>
  );
}
