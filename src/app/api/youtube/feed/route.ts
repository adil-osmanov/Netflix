import { NextRequest, NextResponse } from "next/server";
import { RECOMMENDED_YOUTUBE_VIDEOS } from "@/data/youtubeVideos";
import { YouTubeRecommendedVideo } from "@/types/youtube";

export const dynamic = "force-dynamic";

export const POOL_CHANNELS = [
  { id: "UCbxb2fqe9oNgglAoYqsYOtQ", name: "Easy German", level: "B1" as const },
  { id: "UCxUWIEL-USsiPak0Qy6_vVg", name: "DW Deutsch lernen", level: "B1" as const },
  { id: "UCZHpIFMfoJJ_1QxNGLJTzyA", name: "MrWissen2go", level: "B2" as const },
  { id: "UCUuab1dctZzN5ZmRmQnTzkg", name: "WDR Doku", level: "B2" as const },
  { id: "UC1XrG1M_hw8103zO2x-oivg", name: "Galileo", level: "B1" as const },
  { id: "UC4-a6QWRyBlzTFGdS-T_wfw", name: "SWR Handwerkskunst", level: "B1" as const },
  { id: "UCKGMHVipEvuZudhHD05FOYA", name: "Simplicissimus", level: "B2" as const },
  { id: "UC1Y7onDsPyfP-lu--SXF-ew", name: "Quarks", level: "B2" as const },
  { id: "UCCAI6jmeW5hWz2-jaLPqLUQ", name: "Deutsch mit Marija", level: "B1" as const },
  { id: "UCTPAHk1b-h-WGQn9cfGlw2Q", name: "NDR Doku", level: "B2" as const },
  { id: "UCLLibJTCy3sXjHLVaDimnpQ", name: "ARTE de", level: "B2" as const },
  { id: "UCwRH985XgMYXQ6NxXDo8npw", name: "Kurzgesagt DE", level: "B2" as const },
];

const CHANNEL_ALIASES: Record<string, string> = {
  "UCBxb2fqPB4w05QKumFO7Smw": "UCbxb2fqe9oNgglAoYqsYOtQ",
  "UCtkm88-Yc5iXnh5bLz3s8XQ": "UCxUWIEL-USsiPak0Qy6_vVg",
  "UCek-PCa5_0n95d7bE3fA5gQ": "UCZHpIFMfoJJ_1QxNGLJTzyA",
  "UCgo4zkgx_dZpnmsi8wPrcFQ": "UCUuab1dctZzN5ZmRmQnTzkg",
  "UCpSjXQxK52N5e0qQ6kM3gTw": "UC1XrG1M_hw8103zO2x-oivg",
  "UC8mRz2I5-V-7WzH8b8Qp21w": "UC4-a6QWRyBlzTFGdS-T_wfw",
  "UCMtqU5b4l5Tq8d451g7fMog": "UCKGMHVipEvuZudhHD05FOYA",
  "UCRFsmP3Qh7eGZf-1H_E-Uaw": "UC1Y7onDsPyfP-lu--SXF-ew",
  "UCc_qY7ZqX4W3JgE_aX1ZqYw": "UCCAI6jmeW5hWz2-jaLPqLUQ",
  "UCjZPAU1t_w_qB3lQ4bY3D_w": "UCTPAHk1b-h-WGQn9cfGlw2Q",
  "UCG984VD6xzkJmUkeepBF6gA": "UCLLibJTCy3sXjHLVaDimnpQ",
};

// In-memory cache for channel videos
const channelVideosCache = new Map<string, { videos: YouTubeRecommendedVideo[]; time: number }>();
const CACHE_TTL_MS = 25 * 60 * 1000; // 25 minutes

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function normalizeChannelId(id: string): string {
  return CHANNEL_ALIASES[id] || id;
}

function seededRandom(seed: number) {
  let s = Math.abs(seed) % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffleArrayWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const rng = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function fetchVideosForChannel(
  rawChannelId: string,
  channelName: string,
  level: "B1" | "B2" = "B1"
): Promise<YouTubeRecommendedVideo[]> {
  const channelId = normalizeChannelId(rawChannelId);
  const now = Date.now();
  const cached = channelVideosCache.get(channelId);
  if (cached && now - cached.time < CACHE_TTL_MS && cached.videos.length > 0) {
    return cached.videos;
  }

  const results: YouTubeRecommendedVideo[] = [];

  // 1. Try InnerTube API (WEB client browse)
  try {
    const resp = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240101.01.00",
            hl: "de",
            gl: "DE",
          },
        },
        browseId: channelId,
        params: "EgZ2aWRlb3PyBgQKAjoA",
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs;
      const videoTab = tabs?.find((t: any) => t.tabRenderer?.selected);
      const richItems = videoTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

      for (const item of richItems) {
        const lockup = item?.richItemRenderer?.content?.lockupViewModel;
        const vr = item?.richItemRenderer?.content?.videoRenderer;

        const id = lockup?.contentId || vr?.videoId;
        if (!id || !YOUTUBE_ID_REGEX.test(id)) continue;

        const rawTitle =
          lockup?.metadata?.lockupMetadataViewModel?.title?.content ||
          vr?.title?.runs?.[0]?.text ||
          "";

        // Exclude shorts
        if (
          lockup?.contentType === "LOCKUP_CONTENT_TYPE_SHORTS" ||
          /\b(shorts?|tiktok|reels?)\b/i.test(rawTitle) ||
          /#(shorts?|tiktok|reels?)/i.test(rawTitle)
        ) {
          continue;
        }

        // Duration text
        let durationText = "";
        const badges = lockup?.contentImage?.thumbnailViewModel?.overlays?.[0]?.thumbnailBottomOverlayViewModel?.badges;
        if (Array.isArray(badges) && badges[0]?.thumbnailBadgeViewModel?.text) {
          durationText = badges[0].thumbnailBadgeViewModel.text;
        } else if (vr?.lengthText?.simpleText) {
          durationText = vr.lengthText.simpleText;
        }

        // Check if duration is too short (< 60s)
        if (durationText) {
          const parts = durationText.split(":").map(Number);
          if (parts.length === 2 && parts[0] === 0 && parts[1] < 60) continue;
        }

        results.push({
          id,
          title: rawTitle.replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
          channel: channelName,
          channelId,
          level,
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          description: "",
          durationText: durationText || undefined,
        });
      }
    }
  } catch {}

  // 2. Fallback to RSS Feed if InnerTube yielded nothing
  if (results.length === 0) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const rssResp = await fetch(rssUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (rssResp.ok) {
        const xml = await rssResp.text();
        const entries = xml.split("<entry>").slice(1);
        for (const entry of entries) {
          const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
          const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
          const id = idMatch ? idMatch[1].trim() : "";
          const rawTitle = titleMatch ? titleMatch[1].trim() : "";
          if (id && YOUTUBE_ID_REGEX.test(id) && !/\b(shorts?)\b/i.test(rawTitle)) {
            results.push({
              id,
              title: rawTitle.replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
              channel: channelName,
              channelId,
              level,
              thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
              description: "",
            });
          }
        }
      }
    } catch {}
  }

  if (results.length > 0) {
    channelVideosCache.set(channelId, { videos: results, time: now });
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "recommendations";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "16", 10)));
    const seedParam = searchParams.get("seed");
    const seed = seedParam ? parseInt(seedParam, 10) : 12345;
    const channelIdsParam = searchParams.get("channelIds") || "";

    let baseVideos: YouTubeRecommendedVideo[] = [];

    if (tab === "subscriptions") {
      // Subscriptions mode
      const rawIds = channelIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
      const effectiveIds = rawIds.length > 0 ? rawIds : POOL_CHANNELS.slice(0, 4).map((c) => c.id);

      const channelLists = await Promise.all(
        effectiveIds.map((id) => {
          const poolMatch = POOL_CHANNELS.find((c) => c.id === normalizeChannelId(id));
          const name = poolMatch ? poolMatch.name : "Подписка";
          return fetchVideosForChannel(id, name, poolMatch?.level || "B1");
        })
      );

      // Interleave channels so consecutive videos come from different channels
      const maxLen = Math.max(...channelLists.map((l) => l.length), 0);
      for (let i = 0; i < maxLen; i++) {
        for (const list of channelLists) {
          if (list[i]) {
            baseVideos.push(list[i]);
          }
        }
      }
    } else {
      // Recommendations mode (All pool channels)
      const channelLists = await Promise.all(
        POOL_CHANNELS.map((ch) => fetchVideosForChannel(ch.id, ch.name, ch.level))
      );

      // Interleave pool channels
      const maxLen = Math.max(...channelLists.map((l) => l.length), 0);
      for (let i = 0; i < maxLen; i++) {
        for (const list of channelLists) {
          if (list[i]) {
            baseVideos.push(list[i]);
          }
        }
      }

      // Add curated videos as fallback base
      baseVideos.push(...RECOMMENDED_YOUTUBE_VIDEOS);
    }

    // Deduplicate by ID
    const seen = new Set<string>();
    const deduplicated: YouTubeRecommendedVideo[] = [];
    for (const v of baseVideos) {
      if (!v.id || !YOUTUBE_ID_REGEX.test(v.id)) continue;
      if (!seen.has(v.id)) {
        seen.add(v.id);
        deduplicated.push(v);
      }
    }

    // Shuffle deterministically based on seed
    const shuffled = shuffleArrayWithSeed(deduplicated, seed);

    // Infinite cyclic pagination: never stop or return empty
    const totalCount = shuffled.length;
    let pageVideos: YouTubeRecommendedVideo[] = [];

    if (totalCount > 0) {
      const startIndex = (page - 1) * limit;
      for (let i = 0; i < limit; i++) {
        const itemIndex = (startIndex + i) % totalCount;
        pageVideos.push(shuffled[itemIndex]);
      }
    }

    return NextResponse.json({
      tab,
      page,
      limit,
      seed,
      videos: pageVideos,
      hasMore: true, // Infinite scroll continues seamlessly
      totalAvailable: totalCount,
    });
  } catch (error: any) {
    console.error("API [feed] error:", error?.message);
    return NextResponse.json(
      { error: "Ошибка при получении ленты", details: error?.message, videos: [], hasMore: true },
      { status: 500 }
    );
  }
}
