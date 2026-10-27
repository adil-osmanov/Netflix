import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId')?.trim();

    if (!channelId) {
      return NextResponse.json(
        { error: 'Параметр channelId обязателен' },
        { status: 400 }
      );
    }

    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const resp = await fetch(rssUrl, {
      next: { revalidate: 1800 }, // Cache feed for 30 minutes
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
    const entries = xml.split('<entry>').slice(1);
    const videos = entries.slice(0, 15).map((entry) => {
      const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      const authorMatch = entry.match(/<author>\s*<name>([^<]+)<\/name>/);
      const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);

      const id = idMatch ? idMatch[1].trim() : '';
      const rawTitle = titleMatch ? titleMatch[1].trim() : '';
      const cleanTitle = rawTitle
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      const channel = authorMatch ? authorMatch[1].trim() : '';
      const published = publishedMatch ? publishedMatch[1].trim() : '';

      return {
        id,
        title: cleanTitle,
        channel,
        published,
        level: 'B1' as const, // Default level
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        description: `${channel} • Последние выпуски`,
      };
    }).filter((v) => {
      if (v.id.length !== 11) return false;
      const t = v.title.toLowerCase();
      if (t.includes('#shorts') || t.includes('#short') || t.includes('shorts') || t.includes('#tiktok')) {
        return false;
      }
      return true;
    });

    return NextResponse.json(
      { channelId, videos },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error: any) {
    console.error('API [channel] error:', error?.message);
    return NextResponse.json(
      { error: 'Ошибка сервера при получении видео канала', details: error?.message },
      { status: 500 }
    );
  }
}
