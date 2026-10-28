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

// In-memory cache for extracted og:images across requests
const ogImageCache = new Map<string, string>();

async function fetchOgImage(url: string): Promise<string | null> {
  if (!url) return null;
  if (ogImageCache.has(url)) {
    return ogImageCache.get(url)!;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const html = await res.text();

    // 1. og:image or twitter:image
    const metaMatch =
      html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);

    if (metaMatch && metaMatch[1]) {
      const img = metaMatch[1];
      ogImageCache.set(url, img);
      return img;
    }

    // 2. ZDF JSON layouts in page
    const zdfMatch =
      html.match(/"dim1280X720":\s*"([^"]+)"/i) ||
      html.match(/"dim1920X1080":\s*"([^"]+)"/i) ||
      html.match(/"dim768X432":\s*"([^"]+)"/i);

    if (zdfMatch && zdfMatch[1]) {
      const img = zdfMatch[1].replace(/\\u0026/g, '&');
      ogImageCache.set(url, img);
      return img;
    }
  } catch {
    // Network / timeout error
  }
  return null;
}

function getFallbackThumbnail(channel: string, topic: string, title: string): string {
  const ch = channel.toUpperCase();
  let accentColor = "#e50914";
  if (ch.includes("ZDF")) {
    accentColor = "#fa7d00";
  } else if (ch.includes("ARD") || ch.includes("ERSTE")) {
    accentColor = "#0055a5";
  } else if (ch.includes("ARTE")) {
    accentColor = "#ff501a";
  } else if (ch.includes("3SAT") || ch.includes("WDR") || ch.includes("NDR") || ch.includes("SWR")) {
    accentColor = "#00a399";
  }

  const safeTopic = (topic || "Mediathek").slice(0, 24).replace(/[<>&"]/g, '');
  const safeTitle = (title || "Sendung").slice(0, 32).replace(/[<>&"]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#18181b" />
        <stop offset="100%" stop-color="#09090b" />
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#bg)" />
    <circle cx="580" cy="80" r="130" fill="${accentColor}" opacity="0.14" />
    <rect x="36" y="36" width="96" height="32" rx="6" fill="${accentColor}" opacity="0.25" />
    <text x="84" y="58" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="900" fill="${accentColor}" text-anchor="middle">${ch.slice(0, 10)}</text>
    <text x="36" y="115" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="700" fill="#a1a1aa" letter-spacing="1">${safeTopic.toUpperCase()}</text>
    <text x="36" y="185" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="22" font-weight="800" fill="#f4f4f5">${safeTitle}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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

    const pageItems = finalItems.slice(0, size);

    // Parallel extraction of real og:images for the current page batch
    const itemsWithImages = await Promise.all(
      pageItems.map(async (item) => {
        let poster = await fetchOgImage(item.url_website);
        if (!poster) {
          poster = getFallbackThumbnail(item.channel, item.topic, item.title);
        }
        return {
          ...item,
          thumbnailUrl: poster,
        };
      })
    );

    return NextResponse.json({
      items: itemsWithImages,
      hasMore: rawResults.length >= fetchSize,
    });
  } catch (error: any) {
    console.error('Failed to fetch from Mediathek:', error?.message);
    return NextResponse.json({ items: [], hasMore: false }, { status: 500 });
  }
}
