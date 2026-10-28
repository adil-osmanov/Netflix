import { NextRequest, NextResponse } from "next/server";

const STREAM_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
  "https://piped-api.garudalinux.org",
  "https://invidious.nerdvpn.de",
  "https://inv.tux.pizza",
];

async function tryFetchStream(instance: string, videoId: string): Promise<string | null> {
  const isPiped = instance.includes("piped");
  const url = isPiped
    ? `${instance}/streams/${videoId}`
    : `${instance}/api/v1/videos/${videoId}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(2000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (isPiped) {
      // 1. Check videoStreams with both audio and video
      if (Array.isArray(data.videoStreams)) {
        // Preferred: MP4 with audio
        const combined = data.videoStreams.find(
          (s: any) =>
            !s.videoOnly &&
            (s.format === "MPEG_4" || s.mimeType?.includes("video/mp4")) &&
            s.url
        );
        if (combined?.url) return combined.url;

        // Any combined stream
        const anyCombined = data.videoStreams.find((s: any) => !s.videoOnly && s.url);
        if (anyCombined?.url) return anyCombined.url;
      }
      // 2. Check HLS stream
      if (data.hls && typeof data.hls === "string") {
        return data.hls;
      }
    } else {
      // Invidious format
      if (Array.isArray(data.formatStreams)) {
        const mp4 = data.formatStreams.find(
          (s: any) => s.container === "mp4" && s.url
        );
        if (mp4?.url) return mp4.url;
        if (data.formatStreams[0]?.url) return data.formatStreams[0].url;
      }
      if (data.hlsUrl && typeof data.hlsUrl === "string") {
        return data.hlsUrl;
      }
    }
  } catch {
    // Timeout or network error
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json({ success: false, error: "videoId is required" }, { status: 400 });
  }

  // Query instances with race/fast-fail
  const fetchPromises = STREAM_INSTANCES.map((inst) =>
    tryFetchStream(inst, videoId)
  );

  // Take the first successful stream
  try {
    const results = await Promise.allSettled(fetchPromises);
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        return NextResponse.json({
          success: true,
          streamUrl: r.value,
        });
      }
    }
  } catch {}

  // Seamless fallback to YouTube IFrame
  return NextResponse.json({
    success: false,
    fallback: true,
  });
}
