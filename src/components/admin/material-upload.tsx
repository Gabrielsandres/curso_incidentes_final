"use client";

import { useRef, useState } from "react";
import { Loader2, Paperclip, Upload } from "lucide-react";

import type { MaterialRow } from "@/lib/courses/types";
import { ALLOWED_MATERIAL_MIME_TYPES } from "@/lib/materials/storage";

export type MaterialUploadProps = {
  lessonId: string;
  onUploaded?: (material: MaterialRow) => void;
};

type UploadStatus = "idle" | "uploading" | "success" | "error";

// Build the accept= string once from the authoritative whitelist constant (T5 client-layer mitigation)
const ACCEPT_ATTR = [...ALLOWED_MATERIAL_MIME_TYPES].join(",");

export function MaterialUpload({ lessonId, onUploaded }: MaterialUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setErrorMessage(null);
    setUploadedName(null);

    try {
      const formData = new FormData();
      formData.append("lessonId", lessonId);
      formData.append("file", file);

      const response = await fetch("/api/materials/upload", {
        method: "POST",
        body: formData,
      });

      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        metadata?: { originalFileName?: string };
      } | null;

      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? "Não foi possível enviar o arquivo. Tente novamente.");
      }

      setStatus("success");
      setUploadedName(file.name);

      if (onUploaded && body.metadata) {
        // Caller is responsible for refreshing the full material row from the server
        // onUploaded receives a partial shape; type cast is intentional — caller re-fetches
        onUploaded(body.metadata as unknown as MaterialRow);
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível enviar o arquivo. Tente novamente.",
      );
    } finally {
      // Reset input so the same file can be re-uploaded after an error
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleButtonClick() {
    setStatus("idle");
    setErrorMessage(null);
    inputRef.current?.click();
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full bg-slate-100 p-3">
          {status === "uploading" ? (
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" aria-hidden="true" />
          ) : status === "success" ? (
            <Paperclip className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          ) : (
            <Upload className="h-6 w-6 text-slate-500" aria-hidden="true" />
          )}
        </span>

        {status === "success" && uploadedName ? (
          <p className="text-sm font-medium text-emerald-700">
            Arquivo enviado: <span className="font-semibold">{uploadedName}</span>
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Tipos aceitos: PDF, Word, Excel, PowerPoint, PNG, JPEG &middot; Máx 20 MB
          </p>
        )}

        {status === "error" && errorMessage ? (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleButtonClick}
          disabled={status === "uploading"}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "uploading" ? "Enviando..." : "Selecionar arquivo"}
        </button>

        {/* Hidden file input — accept= mirrors ALLOWED_MATERIAL_MIME_TYPES (client advisory; server is authoritative) */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          aria-hidden="true"
          onChange={(e) => void handleFileChange(e)}
        />
      </div>
    </div>
  );
}
