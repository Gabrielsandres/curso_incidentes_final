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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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
    function parseMessage(raw: unknown): Record<string, unknown> | null {
      if (typeof raw === "object" && raw !== null) {
        return raw as Record<string, unknown>;
      }
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
      return null;
    }

    function handleMessage(event: MessageEvent) {
      const data = parseMessage(event.data);
      if (!data) return;

      // Bunny Stream uses the Player.js protocol. The parent must subscribe to events
      // first via addEventListener (https://github.com/embedly/player.js/blob/master/SPEC.rst).
      // Bunny serializes both directions as JSON strings.
      if (data.context === "player.js") {
        if (data.event === "ready" && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              context: "player.js",
              version: "0.0.11",
              method: "addEventListener",
              value: "ended",
              listener: "lesson-player",
            }),
            "*",
          );
          return;
        }
        if (data.event === "ended") {
          void markLessonAsCompleted("video-end");
          return;
        }
        return;
      }

      // YouTube IFrame API: parent first sends {event:"listening"}; player then emits
      // onReady, onStateChange (info: 0 = ENDED) and infoDelivery (info.playerState: 0).
      if (data.event === "onReady" && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "listening", id: "lesson-player" }),
          "*",
        );
        return;
      }
      const ytInfo = data.info as { playerState?: number } | number | undefined;
      const ytEnded =
        (data.event === "infoDelivery" &&
          typeof ytInfo === "object" &&
          ytInfo?.playerState === 0) ||
        (data.event === "onStateChange" && ytInfo === 0);
      if (ytEnded) {
        void markLessonAsCompleted("video-end");
      }
    }

    // YouTube fires "onReady" only if the parent first declares it is listening.
    // Send the initial listening handshake on mount.
    function sendYouTubeHandshake() {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "listening", id: "lesson-player" }),
          "*",
        );
      }
    }

    window.addEventListener("message", handleMessage);
    const handshakeTimer = window.setTimeout(sendYouTubeHandshake, 1000);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(handshakeTimer);
    };
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
            ref={iframeRef}
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
