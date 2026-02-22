"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LessonWithMaterials } from "@/lib/courses/types";

type LessonPlayerProps = {
  lesson: LessonWithMaterials;
  initialIsCompleted: boolean;
};

type YouTubePlayer = {
  destroy: () => void;
};

type YouTubePlayerStateEvent = {
  data: number;
};

type YouTubePlayerOptions = {
  videoId: string;
  playerVars?: {
    rel?: number;
  };
  events?: {
    onStateChange?: (event: YouTubePlayerStateEvent) => void;
  };
};

type YouTubeApi = {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
  PlayerState: {
    ENDED: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
    __youtubeIframeApiPromise?: Promise<YouTubeApi>;
  }
}

function loadYouTubeIframeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API can only be loaded in the browser."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (window.__youtubeIframeApiPromise) {
    return window.__youtubeIframeApiPromise;
  }

  window.__youtubeIframeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReadyHandler = window.onYouTubeIframeAPIReady;
    const restoreReadyHandler = () => {
      window.onYouTubeIframeAPIReady = previousReadyHandler;
    };

    const timeoutId = window.setTimeout(() => {
      restoreReadyHandler();
      reject(new Error("Timed out while loading YouTube iframe API."));
    }, 15000);

    window.onYouTubeIframeAPIReady = () => {
      previousReadyHandler?.();
      if (window.YT?.Player) {
        window.clearTimeout(timeoutId);
        restoreReadyHandler();
        resolve(window.YT);
        return;
      }

      restoreReadyHandler();
      reject(new Error("YouTube iframe API loaded but Player is unavailable."));
    };

    const existingScript = document.getElementById("youtube-iframe-api");
    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.id = "youtube-iframe-api";
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      restoreReadyHandler();
      reject(new Error("Failed to load YouTube iframe API script."));
    };
    document.head.appendChild(script);
  });

  return window.__youtubeIframeApiPromise;
}

export function LessonPlayer({ lesson, initialIsCompleted }: LessonPlayerProps) {
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);
  const [isSaving, setIsSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const completionRef = useRef(initialIsCompleted);
  const savingRef = useRef(false);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerElementRef = useRef<HTMLDivElement | null>(null);

  const youtubeVideoId = useMemo(() => extractYouTubeVideoId(lesson.video_url), [lesson.video_url]);
  const fallbackEmbedUrl = useMemo(() => buildYouTubeEmbedUrl(lesson.video_url), [lesson.video_url]);

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
          body: JSON.stringify({ lessonId: lesson.id }),
        });

        if (!response.ok) {
          const responseBody = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
          const apiMessage = responseBody?.message?.trim();
          const fallbackMessage =
            response.status === 401
              ? "Sua sessao expirou. Faca login novamente."
              : "Nao foi possivel marcar a aula como concluida. Tente novamente.";
          throw new Error(apiMessage && apiMessage.length > 0 ? apiMessage : fallbackMessage);
        }

        completionRef.current = true;
        setIsCompleted(true);
      } catch (error) {
        const friendlyMessage =
          error instanceof Error && error.message
            ? error.message
            : "Nao foi possivel marcar a aula como concluida. Tente novamente.";
        if (source === "manual") {
          setCompletionError(friendlyMessage);
        }
        console.error("Failed to complete lesson", friendlyMessage);
      } finally {
        setIsSaving(false);
        savingRef.current = false;
      }
    },
    [lesson.id],
  );

  useEffect(() => {
    if (!youtubeVideoId || !playerElementRef.current) {
      return;
    }

    let isCancelled = false;

    void loadYouTubeIframeApi()
      .then((yt) => {
        if (isCancelled || !playerElementRef.current) {
          return;
        }

        playerRef.current = new yt.Player(playerElementRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            rel: 0,
          },
          events: {
            onStateChange: (event) => {
              if (event.data === yt.PlayerState.ENDED) {
                void markLessonAsCompleted("video-end");
              }
            },
          },
        });
      })
      .catch((error) => {
        console.error("Failed to initialize YouTube player", error);
      });

    return () => {
      isCancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [markLessonAsCompleted, youtubeVideoId]);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Aula</p>
        <h1 className="text-2xl font-semibold text-slate-900">{lesson.title}</h1>
        {lesson.description ? <p className="text-sm text-slate-600">{lesson.description}</p> : null}
      </div>

      {youtubeVideoId ? (
        <div className="aspect-video overflow-hidden rounded-xl border border-slate-200 bg-black">
          <div ref={playerElementRef} className="h-full w-full" />
        </div>
      ) : fallbackEmbedUrl ? (
        <div className="aspect-video overflow-hidden rounded-xl border border-slate-200 bg-black">
          <iframe
            title={lesson.title}
            src={fallbackEmbedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Nao foi possivel carregar o video desta aula. Verifique se o link salvo e valido.
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void markLessonAsCompleted("manual")}
            disabled={isCompleted || isSaving}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCompleted ? "Aula concluida" : isSaving ? "Marcando..." : "Marcar aula como concluida"}
          </button>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {isCompleted ? "Concluida" : "Pendente"}
          </span>
        </div>
        <p className="text-xs text-slate-500">Ao terminar o video, a aula e marcada automaticamente como concluida.</p>
        {completionError ? <p className="text-xs text-red-600">{completionError}</p> : null}
      </div>
    </section>
  );
}

function extractYouTubeVideoId(videoUrl: string) {
  try {
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      return videoId || null;
    }

    if (host === "youtube.com") {
      const pathSegments = parsed.pathname.split("/").filter(Boolean);

      if (pathSegments[0] === "embed" && pathSegments[1]) {
        return pathSegments[1];
      }

      const videoId = parsed.searchParams.get("v");
      return videoId || null;
    }

    return null;
  } catch {
    return null;
  }
}

function buildYouTubeEmbedUrl(videoUrl: string) {
  const youtubeVideoId = extractYouTubeVideoId(videoUrl);
  if (youtubeVideoId) {
    return `https://www.youtube.com/embed/${youtubeVideoId}?rel=0`;
  }

  try {
    const parsed = new URL(videoUrl);
    return parsed.toString();
  } catch {
    return null;
  }
}
