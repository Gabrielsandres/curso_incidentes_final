import { createHash } from "node:crypto";

import { getEnv } from "@/lib/env";
import type { PlayableSource } from "@/lib/video/types";

export function getBunnyPlayableSource(
  lesson: { video_external_id: string | null },
  user: { email: string },
): PlayableSource {
  const env = getEnv();
  const tokenKey = env.BUNNY_STREAM_TOKEN_KEY ?? "";
  const libraryId = env.BUNNY_STREAM_LIBRARY_ID ?? "";
  const ttl = env.BUNNY_STREAM_TOKEN_TTL_SECONDS ?? 3600;

  if (!tokenKey || !libraryId) {
    throw new Error(
      "Configuracao Bunny Stream incompleta. Verifique BUNNY_STREAM_TOKEN_KEY e BUNNY_STREAM_LIBRARY_ID.",
    );
  }

  const videoId = lesson.video_external_id ?? "";
  if (!videoId) {
    throw new Error(
      "video_external_id e obrigatorio para o provider Bunny Stream.",
    );
  }

  const expiresUnix = Math.floor(Date.now() / 1000) + ttl;
  const token = createHash("sha256")
    .update(tokenKey + videoId + String(expiresUnix))
    .digest("hex");

  const params = new URLSearchParams({ token, expires: String(expiresUnix) });
  const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;

  return { provider: "bunny", embedUrl, watermarkText: user.email, ttl };
}
