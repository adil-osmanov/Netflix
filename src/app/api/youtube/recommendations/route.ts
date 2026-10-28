import { NextRequest, NextResponse } from "next/server";
import { CORE_CHANNELS, RECOMMENDED_YOUTUBE_VIDEOS } from "@/data/youtubeVideos";
import { YouTubeRecommendedVideo } from "@/types/youtube";

// In-memory cache for aggregated channel feeds
let cachedAllFeedVideos: YouTubeRecommendedVideo[] = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function fetchChannelVideos(channelId: string, channelName: string, level: "B1" | "B2"): Promise<YouTubeRecommendedVideo[]> {
  try {
    let rssUrl = channelId.startsWith("UC")
      ? `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${channelId.slice(2)}`
      : `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    let resp = await fetch(rssUrl, {
      next: { revalidate: 1800 },
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });

    if (!resp.ok && channelId.startsWith("UC")) {
      rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      resp = await fetch(rssUrl, {
        next: { revalidate: 1800 },
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
    }

    if (!resp.ok) return [];

    const xml = await resp.text();
    const entries = xml.split("<entry>").slice(1);

    return entries
      .map((entry) => {
        const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
        const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);

        const id = idMatch ? idMatch[1].trim() : "";
        const rawTitle = titleMatch ? titleMatch[1].trim() : "";
        const cleanTitle = rawTitle
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");
        const desc = descMatch ? descMatch[1].trim() : "";

        // Check vertical aspect ratio
        const widthMatch = entry.match(/width="(\d+)"/);
        const heightMatch = entry.match(/height="(\d+)"/);
        const thumbWidth = widthMatch ? parseInt(widthMatch[1], 10) : 0;
        const thumbHeight = heightMatch ? parseInt(heightMatch[1], 10) : 0;
        const isVertical = thumbWidth > 0 && thumbHeight > 0 && thumbHeight >= thumbWidth;

        return {
          id,
          title: cleanTitle,
          channel: channelName,
          channelId,
          level,
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          description: desc ? desc.slice(0, 160) : `${channelName} • Видео для уровня ${level}`,
          isVertical,
        };
      })
      .filter((v) => {
        if (!v.id || v.id.length !== 11) return false;
        if (v.isVertical) return false;
        const text = (v.title + " " + v.description).toLowerCase();
        if (
          /\b(shorts?|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(text) ||
          /#(shorts?|tiktok|reels?)/i.test(text) ||
          text.includes("🔴")
        ) {
          return false;
        }
        return true;
      });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "16", 10)));
    const excludeParam = searchParams.get("exclude") || "";
    const excludeSet = new Set(excludeParam.split(",").map((s) => s.trim()).filter(Boolean));

    const now = Date.now();
    if (cachedAllFeedVideos.length === 0 || now - lastFetchTime > CACHE_TTL_MS) {
      const channelEntries = Object.values(CORE_CHANNELS);
      const channelResults = await Promise.all(
        channelEntries.map((ch) => fetchChannelVideos(ch.id, ch.name, ch.defaultLevel))
      );

      // Interleave/round-robin across channels for diverse feed
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
      const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

      for (const v of [...interleaved, ...RECOMMENDED_YOUTUBE_VIDEOS]) {
        if (!v.id || !YOUTUBE_ID_REGEX.test(v.id)) continue;
        if (!seen.has(v.id)) {
          seen.add(v.id);
          combined.push(v);
        }
      }

      cachedAllFeedVideos = combined;
      lastFetchTime = now;
    }

    // Filter out already excluded IDs
    const availableVideos = cachedAllFeedVideos.filter((v) => !excludeSet.has(v.id));

    const offset = (page - 1) * limit;
    const pageVideos = availableVideos.slice(offset, offset + limit);

    // If offset went beyond availableVideos, allow cyclical discovery from cached pool
    let finalVideos = pageVideos;
    if (finalVideos.length === 0 && cachedAllFeedVideos.length > 0) {
      const cycleOffset = offset % cachedAllFeedVideos.length;
      finalVideos = cachedAllFeedVideos.slice(cycleOffset, cycleOffset + limit);
    }

    return NextResponse.json({
      page,
      limit,
      videos: finalVideos,
      hasMore: true, // Infinite scroll continues
      totalAvailable: availableVideos.length,
    });
  } catch (error: any) {
    console.error("API [recommendations] error:", error?.message);
    return NextResponse.json(
      { error: "Ошибка при получении рекомендаций", details: error?.message },
      { status: 500 }
    );
  }
}
