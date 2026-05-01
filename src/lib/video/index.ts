import { logger } from "@/lib/logger";
import { getBunnyPlayableSource } from "@/lib/video/bunny-adapter";
import { getYouTubePlayableSource } from "@/lib/video/youtube-adapter";

export type { PlayableSource, VideoProvider, VideoProviderName } from "@/lib/video/types";

export function getPlayableSource(
  lesson: {
    video_provider: string | null;
    video_external_id: string | null;
    video_url: string | null;
  },
  user: { email: string },
) {
  const provider = lesson.video_provider;

  if (provider === "bunny") {
    return getBunnyPlayableSource(lesson, user);
  }

  if (provider === "youtube") {
    return getYouTubePlayableSource(lesson);
  }

  // Fallback: legacy video_url path (D-10)
  if (lesson.video_url) {
    logger.info(
      "Aula sem video_provider — usando fallback legacy video_url",
      { videoUrl: lesson.video_url },
    );
    return getYouTubePlayableSource({
      video_external_id: null,
      video_url: lesson.video_url,
    });
  }

  throw new Error(
    "Aula sem configuracao de video. Configure video_provider e video_external_id.",
  );
}
