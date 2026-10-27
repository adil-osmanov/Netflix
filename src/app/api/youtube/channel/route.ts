import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId")?.trim();

    if (!channelId) {
      return NextResponse.json(
        { error: "Параметр channelId обязателен" },
        { status: 400 }
      );
    }

    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const resp = await fetch(rssUrl, {
      next: { revalidate: 1800 }, // Cache feed for 30 minutes
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Не удалось загрузить RSS фид канала (статус: ${resp.status})` },
        { status: resp.status }
      );
    }

    const xml = await resp.text();

    // Parse RSS XML entries
    const entries = xml.split("<entry>").slice(1);
    const videos = entries
      .map((entry) => {
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

        const channel = authorMatch ? authorMatch[1].trim() : "";
        const published = publishedMatch ? publishedMatch[1].trim() : "";
        const desc = descMatch ? descMatch[1].trim() : "";

        // Extract poster dimensions and duration if present in RSS
        const widthMatch = entry.match(/width="(\d+)"/);
        const heightMatch = entry.match(/height="(\d+)"/);
        const thumbWidth = widthMatch ? parseInt(widthMatch[1], 10) : 0;
        const thumbHeight = heightMatch ? parseInt(heightMatch[1], 10) : 0;
        const isVertical = thumbWidth > 0 && thumbHeight > 0 && thumbHeight >= thumbWidth;

        const durationMatch = entry.match(/duration="(\d+)"/) || entry.match(/seconds="(\d+)"/);
        const durationSec = durationMatch ? parseInt(durationMatch[1], 10) : 0;

        return {
          id,
          title: cleanTitle,
          channel,
          channelId,
          published,
          level: "B1" as const,
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          description: desc ? desc.slice(0, 160) : `${channel} • Последние выпуски`,
          isVertical,
          durationSec,
        };
      })
      .filter((v) => {
        if (v.id.length !== 11) return false;
        // Block vertical videos (Shorts aspect ratio)
        if (v.isVertical) return false;
        // Block videos under 90 seconds
        if (v.durationSec > 0 && v.durationSec < 90) return false;

        const fullText = (v.title + " " + v.description + " " + v.id).toLowerCase();
        // 100% strict Shorts filter (keywords, tags, url paths)
        if (
          /\b(shorts?|tiktok|reels?)\b/i.test(fullText) ||
          /#(shorts?|tiktok|reels?)/i.test(fullText) ||
          fullText.includes("/shorts/")
        ) {
          return false;
        }
        return true;
      });

    return NextResponse.json(
      { channelId, videos },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error: any) {
    console.error("API [channel] error:", error?.message);
    return NextResponse.json(
      { error: "Ошибка сервера при получении видео канала", details: error?.message },
      { status: 500 }
    );
  }
}
