import type { PlayableSource } from "@/lib/video/types";

export function getYouTubePlayableSource(lesson: {
  video_external_id: string | null;
  video_url: string | null;
}): PlayableSource {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "YouTubeUnlistedAdapter nao pode ser usado em producao. " +
        "Altere video_provider para 'bunny' antes de publicar.",
    );
  }

  const videoId =
    lesson.video_external_id ??
    extractYouTubeVideoId(lesson.video_url ?? "");
  if (!videoId) {
    throw new Error("Nao foi possivel determinar o ID do video YouTube.");
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
  return { provider: "youtube", embedUrl, watermarkText: null, ttl: null };
}

function extractYouTubeVideoId(videoUrl: string): string | null {
  try {
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.replace("/", "") || null;
    }

    if (host === "youtube.com") {
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments[0] === "embed" && segments[1]) return segments[1];
      return parsed.searchParams.get("v");
    }

    return null;
  } catch {
    return null;
  }
}
