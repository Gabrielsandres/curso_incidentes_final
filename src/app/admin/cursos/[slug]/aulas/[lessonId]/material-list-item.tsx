"use client";

import { useTransition } from "react";
import { File, Trash2 } from "lucide-react";
import type { MaterialRow } from "@/lib/courses/types";

interface MaterialListItemProps {
  material: MaterialRow;
  sizeDisplay: string;
}

async function deleteMaterialAction(materialId: string): Promise<void> {
  const response = await fetch(`/api/materials/${materialId}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Não foi possível remover o material.");
  }
}

export function MaterialListItem({ material, sizeDisplay }: MaterialListItemProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteMaterialAction(material.id);
    });
  }

  const displayName = material.original_file_name ?? material.label;

  return (
    <li className="flex items-center gap-3 py-2.5">
      <File size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
      <span className="flex-1 truncate text-sm text-slate-900">{displayName}</span>
      {sizeDisplay && (
        <span className="shrink-0 text-xs text-slate-500">{sizeDisplay}</span>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={handleDelete}
        aria-label={`Remover material ${displayName}`}
        className="inline-flex items-center justify-center rounded px-1.5 py-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
  );
}
