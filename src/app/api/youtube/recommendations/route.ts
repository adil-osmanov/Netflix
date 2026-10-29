import { NextRequest, NextResponse } from "next/server";
import { CORE_CHANNELS, RECOMMENDED_YOUTUBE_VIDEOS } from "@/data/youtubeVideos";
import { YouTubeRecommendedVideo } from "@/types/youtube";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Пул тем для бесконечной генерации немецких рекомендаций без повторов
const SEARCH_CLUSTERS = [
  "Terra X Dokumentation",
  "Simplicissimus Analyse",
  "MrWissen2go Geschichte",
  "Quarks Wissen",
  "Easy German Straßenumfrage",
  "WDR Doku Leben",
  "Galileo Experimente",
  "NDR Doku Reportage",
  "SWR Handwerkskunst",
  "ZDFinfo Kriminalität",
  "Arte Dokumentarfilm",
  "Deutschland Gesellschaft Doku",
  "BR Fernsehen Dokumentation",
  "3sat Kulturzeit Doku",
  "rbb Doku Berlin",
  "MDR Dokumentation Geschichte",
  "HR Fernsehen Reportage",
  "ARD Alpha Wissenschaft",
  "Spiegel TV Reportage",
  "ZDFbesseresser Doku",
  "PULS Reportage",
  "Y-Kollektiv Reportage",
  "STRG_F Dokumentation",
  "Kurzgesagt Dinge Erklärt",
];

// In-memory cache for aggregated channel feeds
let cachedAllFeedVideos: YouTubeRecommendedVideo[] = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

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
    return parts[0] >= 10;
  }
  if (parts.length === 3) {
    return true;
  }
  return false;
}

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
    const videoTab = tabs?.find(
      (t: any) => t.tabRenderer?.selected || t.tabRenderer?.content?.richGridRenderer
    );
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

      if (!isValidDuration(durationText)) {
        continue;
      }

      const sources =
        lockup?.contentImage?.thumbnailViewModel?.image?.sources ||
        vr?.thumbnail?.thumbnails ||
        [];
      const firstSource = sources[0];
      const isVertical =
        firstSource &&
        typeof firstSource.width === "number" &&
        typeof firstSource.height === "number" &&
        firstSource.height >= firstSource.width;

      if (isVertical) continue;

      const combinedText = `${id} ${cleanTitle}`.toLowerCase();
      if (
        lockup?.contentType === "LOCKUP_CONTENT_TYPE_SHORTS" ||
        lockup?.contentType === "LOCKUP_CONTENT_TYPE_LIVE" ||
        /\b(shorts?|short|vertical|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(
          combinedText
        ) ||
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

/**
 * Динамический поиск по кластерам немецких тем через YouTube InnerTube Search
 */
async function fetchSearchClusterVideos(clusterQuery: string): Promise<YouTubeRecommendedVideo[]> {
  const results: YouTubeRecommendedVideo[] = [];
  try {
    const resp = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
        query: clusterQuery,
      }),
      cache: "no-store",
    });

    if (!resp.ok) return [];
    const data = await resp.json();
    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents || [];

    for (const sec of sections) {
      const items = sec?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const vr = item?.videoRenderer;
        if (!vr || !vr.videoId || !YOUTUBE_ID_REGEX.test(vr.videoId)) continue;

        const id = vr.videoId;
        const rawTitle = vr.title?.runs?.[0]?.text || vr.title?.simpleText || "";
        const cleanTitle = rawTitle
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        const channelName =
          vr.ownerText?.runs?.[0]?.text ||
          vr.longBylineText?.runs?.[0]?.text ||
          clusterQuery.split(" ")[0];
        const channelId =
          vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || "";
        const durationText = vr.lengthText?.simpleText?.trim() || "";

        if (!isValidDuration(durationText)) continue;

        const combinedText = `${id} ${cleanTitle} ${channelName}`.toLowerCase();
        if (
          /\b(shorts?|short|vertical|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(
            combinedText
          ) ||
          /#(shorts?|short|vertical|tiktok|reels?)/i.test(combinedText) ||
          combinedText.includes("🔴")
        ) {
          continue;
        }

        if (isBlockedVideo({ id, title: cleanTitle })) continue;

        const isB1 = /easy german|handwerk|quarks|galileo|alltag|wdr|ndr|swr/i.test(
          `${channelName} ${clusterQuery}`
        );
        const level: "B1" | "B2" = isB1 ? "B1" : "B2";

        results.push({
          id,
          title: cleanTitle,
          channel: channelName,
          channelId,
          level,
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          description: `${channelName} • ${clusterQuery}`,
          durationText,
        });
      }
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

  // 1. Строго отсекаем все уже показанные на экране ролики (excludeIds)
  let available = pool.filter((v) => {
    const vid = (v as any).youtube_id || v.id;
    if (excludeSet.has(vid)) return false;
    if (isBlockedVideo(v)) return false;
    if (!isValidDuration(v.durationText)) return false;
    if (levelFilter === "B1" && v.level !== "B1") return false;
    if (levelFilter === "B2" && v.level !== "B2") return false;
    return true;
  });

  // 2. Если page > 1 или в пуле осталось мало непоказанных роликов —
  // динамически подгружаем новые кластеры из SEARCH_CLUSTERS
  if (page > 1 || available.length < limit) {
    const startIdx = ((page - 1) * 3 + Math.floor(Math.random() * SEARCH_CLUSTERS.length)) % SEARCH_CLUSTERS.length;
    const selectedClusters = [
      SEARCH_CLUSTERS[startIdx % SEARCH_CLUSTERS.length],
      SEARCH_CLUSTERS[(startIdx + 1) % SEARCH_CLUSTERS.length],
      SEARCH_CLUSTERS[(startIdx + 2) % SEARCH_CLUSTERS.length],
    ];

    const clusterResults = await Promise.all(
      selectedClusters.map((q) => fetchSearchClusterVideos(q))
    );

    const existingPoolIds = new Set(cachedAllFeedVideos.map((v) => v.id));
    for (const list of clusterResults) {
      for (const v of list) {
        if (!existingPoolIds.has(v.id)) {
          existingPoolIds.add(v.id);
          cachedAllFeedVideos.push(v);
        }
        if (!excludeSet.has(v.id)) {
          if (
            levelFilter === "ALL" ||
            (levelFilter === "B1" && v.level === "B1") ||
            (levelFilter === "B2" && v.level === "B2")
          ) {
            available.push(v);
          }
        }
      }
    }

    // Дедупликация available по ID
    const seenAvail = new Set<string>();
    available = available.filter((v) => {
      if (seenAvail.has(v.id) || excludeSet.has(v.id)) return false;
      seenAvail.add(v.id);
      return true;
    });
  }

  const shuffled = shuffleArray(available);
  const finalVideos = shuffled.slice(0, limit).map((v) => ({
    ...v,
    youtube_id: v.id,
  }));

  return NextResponse.json(
    {
      page,
      limit,
      videos: finalVideos,
      items: finalVideos,
      hasMore: true,
      totalAvailable: cachedAllFeedVideos.length,
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
    const excludeParam = searchParams.get("excludeIds") || searchParams.get("exclude") || "";
    const excludeSet = new Set(
      excludeParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );

    return await handleRecommendationsRequest(page, limit, excludeSet, level);
  } catch (error: any) {
    console.error("API [recommendations GET] error:", error?.message);
    return NextResponse.json(
      { error: "Ошибка при получении рекомендаций", videos: [], items: [], hasMore: true },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const page = Math.max(1, Number(body.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(body.limit) || 16));
    const level = body.level || "ALL";
    const rawExclude = body.excludeIds || body.exclude || [];
    const excludeList: string[] = Array.isArray(rawExclude)
      ? rawExclude
      : typeof rawExclude === "string"
      ? rawExclude.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    const excludeSet = new Set(excludeList);

    return await handleRecommendationsRequest(page, limit, excludeSet, level);
  } catch (error: any) {
    console.error("API [recommendations POST] error:", error?.message);
    return NextResponse.json(
      { error: "Ошибка при получении рекомендаций", videos: [], items: [], hasMore: true },
      { status: 500 }
    );
  }
}
