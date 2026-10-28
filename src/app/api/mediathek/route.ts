import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

const TOPICS_POOL = [
  'Terra X', 'Arte', 'ZDFinfo', 'Doku', 'WDR Doku', 'NDR Doku',
  'SWR Handwerkskunst', 'Wissen', 'Spielfilm', 'Technik', 'Natur'
];

// Anti-Trash & Anti-Audiodeskription filter
const TRASH_REGEX = /(audiodeskription|hörfassung|krimi|soko|usedom|masuren|bozen|kroatien-krimi|zürich-krimi|rote rosen|sturm der liebe|silvia kocht|rentnercops|in aller freundschaft|der bergdoktor|barbara salesch)/i;

// In-memory cache for extracted og:images across requests
const ogImageCache = new Map<string, string>();

async function fetchOgImage(url: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null;
  if (ogImageCache.has(url)) {
    return ogImageCache.get(url)!;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

    if (metaMatch && metaMatch[1] && metaMatch[1].startsWith('http')) {
      const img = metaMatch[1].trim();
      ogImageCache.set(url, img);
      return img;
    }

    // 2. ZDF JSON layouts in page
    const zdfMatch =
      html.match(/"dim1280X720":\s*"([^"]+)"/i) ||
      html.match(/"dim1920X1080":\s*"([^"]+)"/i) ||
      html.match(/"dim768X432":\s*"([^"]+)"/i);

    if (zdfMatch && zdfMatch[1]) {
      const img = zdfMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/').trim();
      if (img.startsWith('http')) {
        ogImageCache.set(url, img);
        return img;
      }
    }

    // 3. ARD image service in json
    const ardMatch = html.match(/(https?:\/\/[^"'\s]*api\.ardmediathek\.de\/image-service[^"'\s]*)/i);
    if (ardMatch && ardMatch[1]) {
      const img = ardMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/').trim();
      ogImageCache.set(url, img);
      return img;
    }
  } catch {
    // Timeout or network error
  }
  return null;
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(req: Request) {
  try {
    const { 
      offset = 0, 
      size = 24, 
      level = 'ALL', 
      category = 'ALL', 
      query = '', 
      seed = 0 
    } = await req.json();

    // Shaping search queries
    const queries: Array<{ fields: string[]; query: string }> = [];

    if (query && query.trim()) {
      queries.push({ fields: ['title', 'topic', 'description'], query: query.trim() });
    } else if (category === 'films') {
      queries.push({ fields: ['topic', 'title'], query: 'Spielfilm' });
    } else if (category === 'series') {
      queries.push({ fields: ['topic', 'title'], query: 'Serie' });
    } else if (category === 'doku') {
      queries.push({ fields: ['topic', 'title'], query: 'Terra X Doku Wissen' });
    } else if (category === 'ALL' && seed) {
      const poolIndex = Math.abs(Number(seed)) % TOPICS_POOL.length;
      const topicToQuery = TOPICS_POOL[poolIndex];
      queries.push({ fields: ['topic', 'title'], query: topicToQuery });
    }

    // Larger batch for strict quality and poster filtering
    const fetchSize = Math.max(size * 4, 80);

    const randomShift = (offset === 0 && seed) ? (Math.floor(Math.random() * 4) * 10) : 0;
    const effectiveOffset = offset + randomShift;

    const payload = {
      queries,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      future: false,
      offset: effectiveOffset,
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
    // 1. Duration filter: films >= 50 min (3000s), others >= 15 min (900s)
    // 2. Official German studio subtitles present
    // 3. Skip trash series, daily soaps, and Audiodeskription duplicates
    // 4. Server-side clean title deduplication
    const seenCleanTitles = new Set<string>();

    const filtered = rawResults
      .filter((item) => {
        // Subtitles check
        const subUrl = item.url_subtitle || item.url_subtitles;
        const hasSubtitles = Boolean(subUrl && subUrl.length > 5);
        if (!hasSubtitles) return false;

        // Min duration check
        const minDuration = category === 'films' ? 3000 : 900;
        if (typeof item.duration !== 'number' || item.duration < minDuration) {
          return false;
        }

        // Anti-trash & anti-audiodeskription
        const combinedText = `${item.topic} ${item.title}`;
        if (TRASH_REGEX.test(combinedText)) {
          return false;
        }

        if (/\b(trailer|teaser|vorschau|preview)\b/i.test(item.title)) {
          return false;
        }

        return true;
      })
      .filter((item) => {
        // Clean title from season/episode markers: e.g. (S01/E02), (Folge 12)
        const cleanTitle = item.title
          .replace(/\s*\(S\d+.*\)/gi, '')
          .replace(/\s*\(Folge\s*\d+.*\)/gi, '')
          .replace(/\s*\(E\d+.*\)/gi, '')
          .replace(/\s*\(Teil\s*\d+.*\)/gi, '')
          .trim()
          .toLowerCase();

        const key = `${item.channel.toLowerCase()}-${cleanTitle}`;
        if (seenCleanTitles.has(key)) return false;
        seenCleanTitles.add(key);
        return true;
      })
      .map((item) => {
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
          channel: item.channel,
          duration: Math.round(item.duration / 60), // in minutes
          url_website: item.url_website,
          url_subtitles: item.url_subtitle || item.url_subtitles,
          level: (isB1 ? 'B1' : 'B2') as 'B1' | 'B2',
          date: item.timestamp ? new Date(item.timestamp * 1000).toLocaleDateString('de-DE') : '',
        };
      });

    // Level filter
    const levelFiltered = level === 'ALL'
      ? filtered
      : filtered.filter((item) => item.level === level);

    // Shuffle so cards don't appear in monotonous blocks
    const shuffled = shuffleArray(levelFiltered);

    // Parallel extraction of real og:images
    // IRON RULE: No poster = No card! Only include items with verified real HTTP image posters
    const candidates = shuffled.slice(0, size * 2);
    const enrichedCandidates = await Promise.all(
      candidates.map(async (item) => {
        const poster = await fetchOgImage(item.url_website);
        if (!poster || !poster.startsWith('http')) {
          return null;
        }
        return {
          ...item,
          thumbnailUrl: poster,
        };
      })
    );

    // Strict filter: keep only items with valid HTTP posters
    const validItems = enrichedCandidates.filter(
      (item): item is NonNullable<typeof item> => item !== null && Boolean(item.thumbnailUrl && item.thumbnailUrl.startsWith('http'))
    );

    return NextResponse.json({
      items: validItems.slice(0, size),
      hasMore: rawResults.length >= fetchSize,
    });
  } catch (error: any) {
    console.error('Failed to fetch from Mediathek:', error?.message);
    return NextResponse.json({ items: [], hasMore: false }, { status: 500 });
  }
}
