export type VideoProviderName = "youtube" | "bunny";

export type PlayableSource = {
  provider: VideoProviderName;
  embedUrl: string;
  watermarkText: string | null;
  ttl: number | null;
};

export interface VideoProvider {
  getPlayableSource(
    lesson: { video_external_id: string | null; video_url: string | null },
    user: { email: string },
  ): Promise<PlayableSource> | PlayableSource;
}
