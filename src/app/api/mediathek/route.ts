import { NextResponse } from 'next/server';

interface MediathekItem {
  id?: string;
  channel: string;
  topic: string;
  title: string;
  description: string;
  timestamp: number;
  duration: number; // in seconds
  size: number;
  url_website: string;
  url_video?: string;
  url_video_hd?: string;
  url_subtitle?: string;
  url_subtitles?: string;
}

export async function POST(req: Request) {
  try {
    const { offset = 0, size = 24, level = 'ALL', category = 'ALL', query = '' } = await req.json();

    // Shaping search queries
    const queries: Array<{ fields: string[]; query: string }> = [];

    if (query && query.trim()) {
      queries.push({ fields: ['title', 'topic', 'description'], query: query.trim() });
    }

    if (category === 'films') {
      queries.push({ fields: ['topic', 'title'], query: 'Film' });
    } else if (category === 'series') {
      queries.push({ fields: ['topic', 'title'], query: 'Serie' });
    } else if (category === 'doku') {
      queries.push({ fields: ['topic', 'title'], query: 'Doku' });
    }

    // We fetch a larger batch because we strictly filter for subtitles and >= 15 min
    const fetchSize = Math.max(size * 3, 60);

    const payload = {
      queries,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      future: false,
      offset,
      size: fetchSize,
    };

    const response = await fetch('https://mediathekviewweb.de/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Mediathek API error: ${response.status}`);
    }

    const data = await response.json();
    const rawResults: MediathekItem[] = data.result?.results || [];

    // Filter quality:
    // 1. Duration >= 15 minutes (>= 900 sec)
    // 2. Official German studio subtitles present
    // 3. Skip pure audio descriptions if standard is available or pure trailers
    const seenTitles = new Set<string>();

    const filtered = rawResults
      .filter((item) => {
        const subUrl = item.url_subtitle || item.url_subtitles;
        const hasSubtitles = Boolean(subUrl && subUrl.length > 5);
        const isLongEnough = typeof item.duration === 'number' && item.duration >= 900;
        const isTrailer = /\b(trailer|teaser|vorschau)\b/i.test(item.title);
        return hasSubtitles && isLongEnough && !isTrailer;
      })
      .filter((item) => {
        // Deduplicate almost identical titles (e.g. standard vs Audiodeskription)
        const baseTitle = item.title.replace(/\s*\((?:audiodeskription|hörfassung|ov|omud)\)/i, '').trim();
        const key = `${item.channel}-${baseTitle}`;
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      })
      .map((item) => {
        // Smart level scoring B1 vs B2
        const isB1 =
          item.duration < 1800 ||
          /maus|logo|einfach|alltag|handwerk|reportage|service|ratgeber|küche|kochen/i.test(
            `${item.topic} ${item.title}`
          );

        return {
          id: item.id || `${item.timestamp}-${encodeURIComponent(item.title.slice(0, 20))}`,
          title: item.title,
          topic: item.topic,
          description: item.description,
          channel: item.channel, // ZDF, ARD, Arte, 3sat, NDR, WDR, SWR, BR, MDR...
          duration: Math.round(item.duration / 60), // in minutes
          url_website: item.url_website,
          url_subtitles: item.url_subtitle || item.url_subtitles,
          level: (isB1 ? 'B1' : 'B2') as 'B1' | 'B2',
          date: item.timestamp ? new Date(item.timestamp * 1000).toLocaleDateString('de-DE') : '',
        };
      });

    // Level filter
    const finalItems = level === 'ALL'
      ? filtered
      : filtered.filter((item) => item.level === level);

    return NextResponse.json({
      items: finalItems.slice(0, size),
      hasMore: rawResults.length >= fetchSize,
    });
  } catch (error: any) {
    console.error('Failed to fetch from Mediathek:', error?.message);
    return NextResponse.json({ items: [], hasMore: false }, { status: 500 });
  }
}
