import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Черный список: новости, политика, ток-шоу, мыло, региональные сводки
const TRASH_REGEX = /(tagesschau|heute-journal|heute journal|nachrichten|wetter|presseclub|talkshow|talk|maischberger|markus lanz|hart aber fair|illner|kölner treff|ndr talk show|riverboat|landesschau|abendschau|aktuell|markt|service|gottesdienst|audiodeskription|hörfassung|rote rosen|sturm der liebe|in aller freundschaft|berlin direkt|morgenmagazin|mittagsmagazin)/i;

const ogImageCache = new Map<string, string>();

// Быстрый парсер постеров из og:image (таймаут 1.2 сек)
async function fetchFastPoster(url: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null;
  if (ogImageCache.has(url)) {
    return ogImageCache.get(url)!;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 86400 }
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:image|twitter:image)["']/i);

    let poster = match && match[1] ? match[1].trim() : null;

    if (!poster) {
      // Fallback for ZDF & ARD embedded images in page
      const zdfMatch = html.match(/"dim1280X720":\s*"([^"]+)"/i) || html.match(/"dim1920X1080":\s*"([^"]+)"/i);
      if (zdfMatch && zdfMatch[1]) {
        poster = zdfMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/').trim();
      } else {
        const ardMatch = html.match(/(https?:\/\/[^"'\s]*api\.ardmediathek\.de\/image-service[^"'\s]*)/i);
        if (ardMatch && ardMatch[1]) {
          poster = ardMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/').trim();
        }
      }
    }

    if (poster && poster.startsWith('http')) {
      // Исключаем стандартные дефолтные логотипы каналов вместо постеров
      const lower = poster.toLowerCase();
      if (!lower.includes('default') && !lower.includes('placeholder')) {
        ogImageCache.set(url, poster);
        return poster;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { offset = 0, size = 28, category = 'all', level = 'ALL', query = '' } = await req.json();

    const queries: Array<{ fields: string[]; query: string }> = [];

    if (query && query.trim()) {
      queries.push({ fields: ['title', 'topic'], query: query.trim() });
    } else {
      // Широкие категориальные запросы
      switch (category) {
        case 'films':
          queries.push({ fields: ['topic', 'title'], query: 'Spielfilm Film' });
          break;
        case 'docs':
          queries.push({ fields: ['topic', 'title'], query: 'Dokumentation Doku' });
          break;
        case 'series':
          queries.push({ fields: ['topic', 'title'], query: 'Serie' });
          break;
        default: // 'all'
          queries.push({ fields: ['topic', 'title'], query: 'Film Dokumentation Doku Serie' });
          break;
      }
    }

    const payload = {
      queries,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      future: false,
      offset,
      size: 45, // Запрашиваем с запасом под фильтрацию
    };

    const response = await fetch('https://mediathekviewweb.de/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('Mediathek API error');
    const data = await response.json();
    const rawResults = data.result?.results || [];

    // 1. Первичная фильтрация: субтитры, хронометраж и черный список шлака
    const cleaned = rawResults.filter((item: any) => {
      const hasSubtitles = Boolean(
        (item.url_subtitles && item.url_subtitles.length > 5) ||
        (item.url_subtitle && item.url_subtitle.length > 5)
      );

      // Фильмы и доки должны быть полноценными: от 20 минут (1200 сек)
      const minDuration = category === 'films' ? 2400 : 1200;
      const isLongEnough = typeof item.duration === 'number' && item.duration >= minDuration;

      const fullText = `${item.topic} ${item.title}`;
      const isTrash = TRASH_REGEX.test(fullText);

      return hasSubtitles && isLongEnough && !isTrash;
    });

    // 2. Параллельный сбор реальных обложек
    const enriched = await Promise.all(
      cleaned.map(async (item: any) => {
        const poster = await fetchFastPoster(item.url_website);

        // ЖЕЛЕЗНЫЙ ФИЛЬТР: нет качественной обложки — ролик не попадает в приложение
        if (!poster) return null;

        const isB1 = item.duration < 2100 || /einfach|alltag|wissen|reise/i.test(`${item.topic} ${item.title}`);

        return {
          id: item.id || `${item.timestamp}-${item.title.slice(0, 15)}`,
          title: item.title,
          topic: item.topic,
          channel: item.channel,
          duration: Math.round(item.duration / 60),
          url_website: item.url_website,
          posterUrl: poster,
          thumbnailUrl: poster,
          level: isB1 ? 'B1' : 'B2',
          date: new Date(item.timestamp * 1000).toLocaleDateString('de-DE'),
        };
      })
    );

    // 3. Отсекаем пустые и устраняем дубликаты серий/фильмов на одной странице
    const validItems = enriched.filter(Boolean);
    const uniqueMap = new Map();
    validItems.forEach((it: any) => {
      // Нормализуем название, отсекая номера серий и знаки
      const cleanTitle = it.title.replace(/\s*\(S\d+.*\)/gi, '').split('-')[0].trim().toLowerCase();
      if (!uniqueMap.has(cleanTitle)) {
        uniqueMap.set(cleanTitle, it);
      }
    });

    const finalItems = Array.from(uniqueMap.values()).slice(0, size);

    const filteredByLevel = level === 'ALL'
      ? finalItems
      : finalItems.filter((i: any) => i.level === level);

    return NextResponse.json({
      items: filteredByLevel,
      hasMore: rawResults.length >= 45,
    });
  } catch (error) {
    console.error('Mediathek API route error:', error);
    return NextResponse.json({ items: [], hasMore: false }, { status: 500 });
  }
}
