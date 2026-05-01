import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetEnvCache } from "@/lib/env";
import { getBunnyPlayableSource } from "@/lib/video/bunny-adapter";
import { getPlayableSource } from "@/lib/video/index";
import { getYouTubePlayableSource } from "@/lib/video/youtube-adapter";

// ---------------------------------------------------------------------------
// Grupo 1: video/bunny-adapter
// ---------------------------------------------------------------------------

describe("video/bunny-adapter", () => {
  const videoId = "abc123videoId";
  const userEmail = "test@example.com";

  beforeEach(() => {
    resetEnvCache();
    process.env.BUNNY_STREAM_TOKEN_KEY = "testtokenkey123";
    process.env.BUNNY_STREAM_LIBRARY_ID = "99999";
    process.env.BUNNY_STREAM_TOKEN_TTL_SECONDS = "3600";
  });

  afterEach(() => {
    resetEnvCache();
    delete process.env.BUNNY_STREAM_TOKEN_KEY;
    delete process.env.BUNNY_STREAM_LIBRARY_ID;
    delete process.env.BUNNY_STREAM_TOKEN_TTL_SECONDS;
  });

  it("produces hex SHA256 token — 64-char hex string, not base64", () => {
    const result = getBunnyPlayableSource(
      { video_external_id: videoId },
      { email: userEmail },
    );

    // Token must be exactly a 64-char lowercase hex string (SHA256 digest)
    expect(result.embedUrl).toMatch(/token=[0-9a-f]{64}/);
  });

  it("token is NOT HMAC — plain SHA256 hash (key+videoId+expires concatenated)", () => {
    const result = getBunnyPlayableSource(
      { video_external_id: videoId },
      { email: userEmail },
    );

    // Extract expires from URL
    const expiresMatch = result.embedUrl.match(/expires=(\d+)/);
    expect(expiresMatch).not.toBeNull();
    const expires = parseInt(expiresMatch![1], 10);

    // Extract token from URL
    const tokenMatch = result.embedUrl.match(/token=([0-9a-f]{64})/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    // Verify SHA256 plain hash (not HMAC)
    const expectedToken = createHash("sha256")
      .update("testtokenkey123" + videoId + String(expires))
      .digest("hex");

    expect(token).toBe(expectedToken);
  });

  it("includes expires within TTL window (AP-02: TTL <= 14400s)", () => {
    const result = getBunnyPlayableSource(
      { video_external_id: videoId },
      { email: userEmail },
    );

    const expiresMatch = result.embedUrl.match(/expires=(\d+)/);
    expect(expiresMatch).not.toBeNull();
    const expires = parseInt(expiresMatch![1], 10);
    const now = Math.floor(Date.now() / 1000);

    expect(expires - now).toBeLessThanOrEqual(14400);
    expect(expires - now).toBeGreaterThan(0);
  });

  it("embed URL format is https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}?token=...&expires=...", () => {
    const result = getBunnyPlayableSource(
      { video_external_id: videoId },
      { email: userEmail },
    );

    // Check the URL structure: scheme + host + path + query params
    expect(result.embedUrl).toContain(
      "https://iframe.mediadelivery.net/embed/99999/abc123videoId",
    );
    expect(result.embedUrl).toMatch(/token=[0-9a-f]{64}/);
    expect(result.embedUrl).toMatch(/expires=\d+/);
  });

  it("watermarkText equals user.email", () => {
    const result = getBunnyPlayableSource(
      { video_external_id: videoId },
      { email: userEmail },
    );

    expect(result.watermarkText).toBe(userEmail);
  });

  it("provider field equals 'bunny'", () => {
    const result = getBunnyPlayableSource(
      { video_external_id: videoId },
      { email: userEmail },
    );

    expect(result.provider).toBe("bunny");
  });
});

// ---------------------------------------------------------------------------
// Grupo 2: video/youtube-adapter
// ---------------------------------------------------------------------------

describe("video/youtube-adapter", () => {
  const youtubeVideoId = "dQw4w9WgXcQ";

  it("throws Error in production (VID-02)", () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      // @ts-expect-error — overriding read-only for test
      process.env.NODE_ENV = "production";
      expect(() =>
        getYouTubePlayableSource({
          video_external_id: youtubeVideoId,
          video_url: null,
        }),
      ).toThrow();
    } finally {
      // @ts-expect-error — restoring read-only
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("returns YouTube embedUrl with enablejsapi=1 and rel=0 in dev", () => {
    const result = getYouTubePlayableSource({
      video_external_id: youtubeVideoId,
      video_url: null,
    });

    expect(result.embedUrl).toBe(
      `https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&rel=0`,
    );
  });

  it("watermarkText is null (no watermark in dev)", () => {
    const result = getYouTubePlayableSource({
      video_external_id: youtubeVideoId,
      video_url: null,
    });

    expect(result.watermarkText).toBeNull();
  });

  it("resolves videoId from video_external_id", () => {
    const result = getYouTubePlayableSource({
      video_external_id: youtubeVideoId,
      video_url: null,
    });

    expect(result.embedUrl).toContain(youtubeVideoId);
    expect(result.provider).toBe("youtube");
  });

  it("falls back to extracting videoId from video_url when video_external_id is null", () => {
    const result = getYouTubePlayableSource({
      video_external_id: null,
      video_url: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
    });

    expect(result.embedUrl).toBe(
      `https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&rel=0`,
    );
  });
});

// ---------------------------------------------------------------------------
// Grupo 3: video/index (factory)
// ---------------------------------------------------------------------------

describe("video/index (factory)", () => {
  const userEmail = "factory@example.com";

  beforeEach(() => {
    resetEnvCache();
    process.env.BUNNY_STREAM_TOKEN_KEY = "factorytokenkey456";
    process.env.BUNNY_STREAM_LIBRARY_ID = "88888";
    process.env.BUNNY_STREAM_TOKEN_TTL_SECONDS = "3600";
  });

  afterEach(() => {
    resetEnvCache();
    delete process.env.BUNNY_STREAM_TOKEN_KEY;
    delete process.env.BUNNY_STREAM_LIBRARY_ID;
    delete process.env.BUNNY_STREAM_TOKEN_TTL_SECONDS;
  });

  it("routes video_provider='bunny' to bunny adapter", () => {
    const result = getPlayableSource(
      {
        video_provider: "bunny",
        video_external_id: "bunnyvideo123",
        video_url: null,
      },
      { email: userEmail },
    );

    expect(result.provider).toBe("bunny");
    expect(result.embedUrl).toContain("iframe.mediadelivery.net");
  });

  it("routes video_provider='youtube' to youtube adapter", () => {
    const result = getPlayableSource(
      {
        video_provider: "youtube",
        video_external_id: "dQw4w9WgXcQ",
        video_url: null,
      },
      { email: userEmail },
    );

    expect(result.provider).toBe("youtube");
    expect(result.embedUrl).toContain("youtube.com/embed");
  });

  it("falls back to legacy video_url when video_provider is null and video_url is set (D-10)", () => {
    const result = getPlayableSource(
      {
        video_provider: null,
        video_external_id: null,
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
      { email: userEmail },
    );

    // Falls back to YouTube adapter using video_url
    expect(result.provider).toBe("youtube");
    expect(result.embedUrl).toContain("youtube.com/embed");
  });

  it("throws when video_provider is null and video_url is also null", () => {
    expect(() =>
      getPlayableSource(
        {
          video_provider: null,
          video_external_id: null,
          video_url: null,
        },
        { email: userEmail },
      ),
    ).toThrow();
  });
});
