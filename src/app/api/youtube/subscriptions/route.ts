import { NextRequest, NextResponse } from "next/server";
import { YouTubeRecommendedVideo } from "@/types/youtube";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelIdsParam = searchParams.get("channelIds") || "";
    const rawChannelIds = channelIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
    const channelIds = Array.from(
      new Set(
        rawChannelIds.map((id) =>
          id === "UCBxb2fqPB4w05QKumFO7Smw" ? "UCbxb2fqe9oNgglAoYqsYOtQ" : id
        )
      )
    );
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "16", 10)));
    const excludeParam = searchParams.get("exclude") || "";
    const excludeSet = new Set(excludeParam.split(",").map((s) => s.trim()).filter(Boolean));

    if (channelIds.length === 0) {
      return NextResponse.json({
        page,
        limit,
        videos: [],
        hasMore: false,
      });
    }

    const allVideos: YouTubeRecommendedVideo[] = [];

    await Promise.all(
      channelIds.map(async (channelId) => {
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

          if (!resp.ok) return;

          const xml = await resp.text();
          const entries = xml.split("<entry>").slice(1);

          for (const entry of entries) {
            const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
            const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
            const authorMatch = entry.match(/<author>\s*<name>([^<]+)<\/name>/);
            const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
            const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);

            const id = idMatch ? idMatch[1].trim() : "";
            const rawTitle = titleMatch ? titleMatch[1].trim() : "";
            const cleanTitle = rawTitle
              .replace(/&amp;/g, "&")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">");
            const channel = authorMatch ? authorMatch[1].trim() : "Канал";
            const published = publishedMatch ? publishedMatch[1].trim() : "";
            const desc = descMatch ? descMatch[1].trim() : "";

            const widthMatch = entry.match(/width="(\d+)"/);
            const heightMatch = entry.match(/height="(\d+)"/);
            const thumbWidth = widthMatch ? parseInt(widthMatch[1], 10) : 0;
            const thumbHeight = heightMatch ? parseInt(heightMatch[1], 10) : 0;
            const isVertical = thumbWidth > 0 && thumbHeight > 0 && thumbHeight >= thumbWidth;

            if (!id || id.length !== 11 || isVertical) continue;

            const text = (cleanTitle + " " + desc).toLowerCase();
            if (
              /\b(shorts?|tiktok|reels?)\b/i.test(text) ||
              /#(shorts?|tiktok|reels?)/i.test(text)
            ) {
              continue;
            }

            allVideos.push({
              id,
              title: cleanTitle,
              channel,
              channelId,
              published,
              level: "B1",
              thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
              description: desc ? desc.slice(0, 160) : `${channel} • Последние выпуски`,
            });
          }
        } catch {}
      })
    );

    // Sort by publication date (newest first)
    allVideos.sort((a, b) => {
      const timeA = a.published ? new Date(a.published).getTime() : 0;
      const timeB = b.published ? new Date(b.published).getTime() : 0;
      return timeB - timeA;
    });

    // Deduplicate
    const seen = new Set<string>();
    const deduplicated: YouTubeRecommendedVideo[] = [];
    for (const v of allVideos) {
      if (!seen.has(v.id)) {
        seen.add(v.id);
        deduplicated.push(v);
      }
    }

    const availableVideos = deduplicated.filter((v) => !excludeSet.has(v.id));
    const offset = (page - 1) * limit;
    const pageVideos = availableVideos.slice(offset, offset + limit);

    return NextResponse.json({
      page,
      limit,
      videos: pageVideos,
      hasMore: offset + limit < availableVideos.length,
      totalAvailable: availableVideos.length,
    });
  } catch (error: any) {
    console.error("API [subscriptions] error:", error?.message);
    return NextResponse.json(
      { error: "Ошибка при получении видео подписок", details: error?.message },
      { status: 500 }
    );
  }
}
