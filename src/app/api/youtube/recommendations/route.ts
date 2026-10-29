import { NextRequest, NextResponse } from "next/server";
import { CORE_CHANNELS, RECOMMENDED_YOUTUBE_VIDEOS } from "@/data/youtubeVideos";
import { YouTubeRecommendedVideo } from "@/types/youtube";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-memory cache for aggregated channel feeds (only raw pool; shuffled freshly on every request)
let cachedAllFeedVideos: YouTubeRecommendedVideo[] = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

// Blacklist of known broken videos, deleted IDs, or misleading titles
const BLOCKED_TITLE_PATTERNS = [
  /winnetou/i,
  /die\s+entzifferung/i,
  /harald\s+lesch.*terra/i,
  /sarg\s+selbst/i,
  /testosteron[-_\s]*krise/i,
  /testosteron/i,
];

function isBlockedVideo(v: { id?: string; title?: string; description?: string }): boolean {
  const combined = `${v.id || ""} ${v.title || ""} ${v.description || ""}`.toLowerCase();
  return BLOCKED_TITLE_PATTERNS.some((pattern) => pattern.test(combined));
}

// Строгий лимит хронометража: строго от 10 минут (>= 600 секунд)
export function isValidDuration(durationStr?: string, seconds?: number): boolean {
  if (typeof seconds === "number" && seconds < 600) return false;
  if (!durationStr) return false;

  const minMatch = durationStr.match(/(\d+)\s*(?:мин|min)/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10) >= 10;
  }

  const parts = durationStr.split(":").map(Number);
  if (parts.some(isNaN)) return false;
  if (parts.length === 2) {
    // MM:SS -> отсекаем всё, где минут меньше 10
    return parts[0] >= 10;
  }
  if (parts.length === 3) {
    // HH:MM:SS -> видео идет больше часа, подходит на 100%
    return true;
  }
  return false;
}

// Честное перемешивание на сервере (Fisher-Yates Shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchChannelVideosInnerTube(
  channelId: string,
  channelName: string,
  level: "B1" | "B2"
): Promise<YouTubeRecommendedVideo[]> {
  const results: YouTubeRecommendedVideo[] = [];

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
      next: { revalidate: 900 },
    });

    if (!resp.ok) return [];

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

      const cleanTitle = rawTitle
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

      // Извлекаем хронометраж из наложения превью
      let durationText = "";
      const overlays = lockup?.contentImage?.thumbnailViewModel?.overlays || [];
      for (const ov of overlays) {
        const badges = ov?.thumbnailBottomOverlayViewModel?.badges;
        if (Array.isArray(badges) && badges[0]?.thumbnailBadgeViewModel?.text) {
          durationText = badges[0].thumbnailBadgeViewModel.text.trim();
          break;
        }
      }
      if (!durationText && vr?.lengthText?.simpleText) {
        durationText = vr.lengthText.simpleText.trim();
      }

      // Железное правило: строго от 10 минут (>= 600 секунд)
      if (!isValidDuration(durationText)) {
        continue;
      }

      // Проверка ориентации (отсев вертикальных Shorts)
      const sources = lockup?.contentImage?.thumbnailViewModel?.image?.sources || vr?.thumbnail?.thumbnails || [];
      const firstSource = sources[0];
      const isVertical =
        firstSource &&
        typeof firstSource.width === "number" &&
        typeof firstSource.height === "number" &&
        firstSource.height >= firstSource.width;

      if (isVertical) continue;

      const combinedText = `${id} ${cleanTitle}`.toLowerCase();

      // Тотальный бан Shorts и стримов
      if (
        lockup?.contentType === "LOCKUP_CONTENT_TYPE_SHORTS" ||
        lockup?.contentType === "LOCKUP_CONTENT_TYPE_LIVE" ||
        /\b(shorts?|short|vertical|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(combinedText) ||
        /#(shorts?|short|vertical|tiktok|reels?)/i.test(combinedText) ||
        combinedText.includes("/shorts/") ||
        combinedText.includes("🔴")
      ) {
        continue;
      }

      if (isBlockedVideo({ id, title: cleanTitle })) continue;

      results.push({
        id,
        title: cleanTitle,
        channel: channelName,
        channelId,
        level,
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        description: `${channelName} • Видео для уровня ${level}`,
        durationText,
      });
    }
  } catch {
    return [];
  }

  return results;
}

async function getRecommendationsPool(): Promise<YouTubeRecommendedVideo[]> {
  const now = Date.now();
  if (cachedAllFeedVideos.length === 0 || now - lastFetchTime > CACHE_TTL_MS) {
    const channelEntries = Object.values(CORE_CHANNELS);
    const channelResults = await Promise.all(
      channelEntries.map((ch) => fetchChannelVideosInnerTube(ch.id, ch.name, ch.defaultLevel))
    );

    const interleaved: YouTubeRecommendedVideo[] = [];
    const maxLen = Math.max(...channelResults.map((r) => r.length), 0);

    for (let i = 0; i < maxLen; i++) {
      for (const list of channelResults) {
        if (list[i]) {
          interleaved.push(list[i]);
        }
      }
    }

    const seen = new Set<string>();
    const combined: YouTubeRecommendedVideo[] = [];

    for (const v of [...interleaved, ...RECOMMENDED_YOUTUBE_VIDEOS]) {
      if (!v.id || !YOUTUBE_ID_REGEX.test(v.id)) continue;
      if (isBlockedVideo(v)) continue;
      // Строго от 10 минут
      if (!isValidDuration(v.durationText)) continue;

      const text = `${v.id} ${v.title} ${v.description || ""}`.toLowerCase();
      if (
        /\b(shorts?|short|vertical|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(text) ||
        /#(shorts?|short|vertical|tiktok|reels?)/i.test(text)
      ) {
        continue;
      }

      if (!seen.has(v.id)) {
        seen.add(v.id);
        combined.push(v);
      }
    }

    cachedAllFeedVideos = combined;
    lastFetchTime = now;
  }

  return cachedAllFeedVideos;
}

async function handleRecommendationsRequest(
  page: number,
  limit: number,
  excludeSet: Set<string>,
  levelFilter: string = "ALL"
) {
  const pool = await getRecommendationsPool();

  // Фильтруем уже показанные ролики и уровень сложности
  const filteredPool = pool.filter((v) => {
    if (excludeSet.has(v.id)) return false;
    if (isBlockedVideo(v)) return false;
    if (!isValidDuration(v.durationText)) return false;
    if (levelFilter === "B1" && v.level !== "B1") return false;
    if (levelFilter === "B2" && v.level !== "B2") return false;
    return true;
  });

  // Честное перемешивание на сервере (Fisher-Yates Shuffle) перед отправкой клиенту
  const shuffled = shuffleArray(filteredPool.length > 0 ? filteredPool : pool.filter((v) => isValidDuration(v.durationText)));
  const finalVideos = shuffled.slice(0, limit);

  return NextResponse.json(
    {
      page,
      limit,
      videos: finalVideos,
      hasMore: true,
      totalAvailable: pool.length,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "16", 10)));
    const level = searchParams.get("level") || "ALL";
    const excludeParam = searchParams.get("exclude") || "";
    const excludeSet = new Set(excludeParam.split(",").map((s) => s.trim()).filter(Boolean));

    return await handleRecommendationsRequest(page, limit, excludeSet, level);
  } catch (error: any) {
    console.error("API [recommendations GET] error:", error?.message);
    return NextResponse.json(
      { error: "Ошибка при получении рекомендаций", details: error?.message },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const page = Math.max(1, Number(body.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(body.limit) || 16));
    const level = body.level || "ALL";
    const excludeList: string[] = Array.isArray(body.exclude)
      ? body.exclude
      : typeof body.exclude === "string"
      ? body.exclude.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    const excludeSet = new Set(excludeList);

    return await handleRecommendationsRequest(page, limit, excludeSet, level);
  } catch (error: any) {
    console.error("API [recommendations POST] error:", error?.message);
    return NextResponse.json(
      { error: "Ошибка при получении рекомендаций", details: error?.message },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
