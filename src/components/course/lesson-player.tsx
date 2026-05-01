"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LessonPlayerProps = {
  embedUrl: string;
  provider: "youtube" | "bunny";
  watermarkText: string | null;
  lessonId: string;
  lessonTitle: string;
  lessonDescription: string | null;
  initialIsCompleted: boolean;
};

function WatermarkOverlay({ text }: { text: string }) {
  const [corner, setCorner] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCorner((c) => ((c + 1) % 4) as 0 | 1 | 2 | 3);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const positionClass = [
    "top-3 left-3",
    "top-3 right-3",
    "bottom-12 right-3",
    "bottom-12 left-3",
  ][corner];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${positionClass} select-none text-sm font-semibold text-white transition-opacity duration-500`}
      style={{ opacity: 0.12 }}
    >
      {text}
    </div>
  );
}

export function LessonPlayer({
  embedUrl,
  watermarkText,
  lessonId,
  lessonTitle,
  lessonDescription,
  initialIsCompleted,
}: LessonPlayerProps) {
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);
  const [isSaving, setIsSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);

  const completionRef = useRef(initialIsCompleted);
  const savingRef = useRef(false);

  useEffect(() => {
    completionRef.current = isCompleted;
  }, [isCompleted]);

  const markLessonAsCompleted = useCallback(
    async (source: "manual" | "video-end") => {
      if (completionRef.current || savingRef.current) {
        return;
      }

      setCompletionError(null);
      setIsSaving(true);
      savingRef.current = true;

      try {
        const response = await fetch("/api/lesson-progress/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ lessonId }),
        });

        if (!response.ok) {
          const responseBody = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
          const apiMessage = responseBody?.message?.trim();
          const fallbackMessage =
            response.status === 401
              ? "Sua sessão expirou. Faça login novamente."
              : "Não foi possível marcar a aula como concluída. Tente novamente.";
          throw new Error(apiMessage && apiMessage.length > 0 ? apiMessage : fallbackMessage);
        }

        const responseBody = (await response.json().catch(() => null)) as { ok: boolean; isCourseCompleted?: boolean } | null;
        completionRef.current = true;
        setIsCompleted(true);
        if (responseBody?.isCourseCompleted === true) {
          setShowCompletionBanner(true);
        }
      } catch (error) {
        const friendlyMessage =
          error instanceof Error && error.message
            ? error.message
            : "Não foi possível marcar a aula como concluída. Tente novamente.";
        if (source === "manual") {
          setCompletionError(friendlyMessage);
        }
        console.error("Failed to complete lesson", friendlyMessage);
      } finally {
        setIsSaving(false);
        savingRef.current = false;
      }
    },
    [lessonId],
  );

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Bunny Stream: Player.js protocol (D-12, verified via Player.js spec)
      if (
        typeof event.data === "object" &&
        event.data !== null &&
        (event.data as Record<string, unknown>).context === "player.js" &&
        (event.data as Record<string, unknown>).event === "ended"
      ) {
        void markLessonAsCompleted("video-end");
        return;
      }

      // YouTube: infoDelivery with playerState 0 (ENDED) (D-14)
      if (typeof event.data === "string") {
        try {
          const parsed = JSON.parse(event.data) as {
            event?: string;
            info?: { playerState?: number };
          };
          if (parsed.event === "infoDelivery" && parsed.info?.playerState === 0) {
            void markLessonAsCompleted("video-end");
          }
        } catch {
          // not a JSON message — ignore
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [markLessonAsCompleted]);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Aula</p>
        <h1 className="text-2xl font-semibold text-slate-900">{lessonTitle}</h1>
        {lessonDescription ? <p className="text-sm text-slate-600">{lessonDescription}</p> : null}
      </div>

      {!embedUrl ? (
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Não foi possível carregar o vídeo desta aula. Verifique se o ID de vídeo salvo é válido.
        </div>
      ) : (
        <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-black">
          <iframe
            title={lessonTitle}
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
          {watermarkText !== null ? <WatermarkOverlay text={watermarkText} /> : null}
        </div>
      )}

      <div className="space-y-2">
        {showCompletionBanner ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700"
          >
            Curso concluído!{" "}
            <a
              href="/dashboard"
              className="font-semibold underline hover:text-emerald-800"
            >
              Seu certificado está disponível no painel.
            </a>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void markLessonAsCompleted("manual")}
            disabled={isCompleted || isSaving}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCompleted ? "Aula concluída" : isSaving ? "Marcando..." : "Marcar aula como concluída"}
          </button>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {isCompleted ? "Concluída" : "Pendente"}
          </span>
        </div>
        <p className="text-xs text-slate-500">Ao terminar o vídeo, a aula é marcada automaticamente como concluída.</p>
        {completionError ? <p className="text-xs text-red-600">{completionError}</p> : null}
      </div>
    </section>
  );
}
