import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Пул случайных ключевых слов для свободного, но качественного поиска
const THEMES_DOCS = [
  'Dokumentation', 'Doku', 'Reportage', 'Natur', 'Zukunft', 
  'Technik', 'Universum', 'Geschichte', 'Geheimnis', 'Psychologie', 
  'Abenteuer', 'Wissenschaft', 'Erde', 'Arte'
];

const THEMES_FILMS = [
  'Spielfilm', 'Fernsehfilm', 'Kino', 'Drama', 'Thriller', 
  'Komödie', 'Film im Ersten', 'Herzkino'
];

const THEMES_SERIES = [
  'Serie', 'Miniserie', 'Staffel'
];

// Черный список: утренние шоу, новости, политика, ток-шоу, архивные беседы
const TRASH_REGEX = /(tagesschau|heute-journal|nachrichten|wetter|presseclub|talkshow|talk|maischberger|markus lanz|hart aber fair|illner|kölner treff|riverboat|landesschau|abendschau|aktuell|markt|service|gottesdienst|audiodeskription|hörfassung|rote rosen|sturm der liebe|in aller freundschaft|berlin direkt|morgenmagazin|mittagsmagazin|zeitzeugen)/i;

const ogImageCache = new Map<string, string>();

// Быстрый сбор og:image (таймаут 1.2 сек)
async function fetchPosterFast(url: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null;
  if (ogImageCache.has(url)) {
    return ogImageCache.get(url)!;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 86400 }
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:image|twitter:image)["']/i);

    let img = match && match[1] ? match[1].trim() : null;

    if (!img) {
      // Fallback for ZDF & ARD embedded images in page
      const zdfMatch = html.match(/"dim1280X720":\s*"([^"]+)"/i) || html.match(/"dim1920X1080":\s*"([^"]+)"/i);
      if (zdfMatch && zdfMatch[1]) {
        img = zdfMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/').trim();
      } else {
        const ardMatch = html.match(/(https?:\/\/[^"'\s]*api\.ardmediathek\.de\/image-service[^"'\s]*)/i);
        if (ardMatch && ardMatch[1]) {
          img = ardMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/').trim();
        }
      }
    }

    if (img && img.startsWith('http')) {
      const lower = img.toLowerCase();
      if (!lower.includes('placeholder') && !lower.includes('default_logo')) {
        ogImageCache.set(url, img);
        return img;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { 
      category = 'all', 
      level = 'ALL', 
      query = '', 
      offset = 0, 
      size = 24 
    } = await req.json();

    const queries: Array<{ fields: string[]; query: string }> = [];

    // 1. Формирование запроса под категорию со случайной темой
    if (query && query.trim()) {
      queries.push({ fields: ['title', 'topic'], query: query.trim() });
    } else {
      let chosenTheme = '';
      if (category === 'films') {
        chosenTheme = THEMES_FILMS[Math.floor(Math.random() * THEMES_FILMS.length)];
      } else if (category === 'docs') {
        chosenTheme = THEMES_DOCS[Math.floor(Math.random() * THEMES_DOCS.length)];
      } else if (category === 'series') {
        chosenTheme = THEMES_SERIES[Math.floor(Math.random() * THEMES_SERIES.length)];
      } else {
        // 'all' — выбираем случайную тему из фильмов или доков
        const allThemes = [...THEMES_DOCS, ...THEMES_FILMS];
        chosenTheme = allThemes[Math.floor(Math.random() * allThemes.length)];
      }
      queries.push({ fields: ['topic', 'title'], query: chosenTheme });
    }

    // Случайный сдвиг оффсета для разнообразия выдачи (чтобы каждый раз были разные ролики)
    const randomOffset = query && query.trim() ? offset : offset + Math.floor(Math.random() * 8) * 10;

    const payload = {
      queries,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      future: false,
      offset: randomOffset,
      size: 40, // берем с запасом на отсев
    };

    const response = await fetch('https://mediathekviewweb.de/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('Mediathek API error');
    const data = await response.json();
    const rawResults = data.result?.results || [];

    // 2. Первичный отсев мусора и коротких роликов
    const minDurationSec = category === 'films' ? 3000 : 1200; // Фильмы от 50 мин, доки от 20 мин

    const filtered = rawResults.filter((item: any) => {
      const hasSubtitles = Boolean(
        (item.url_subtitles && item.url_subtitles.length > 5) ||
        (item.url_subtitle && item.url_subtitle.length > 5)
      );
      const isLongEnough = typeof item.duration === 'number' && item.duration >= minDurationSec;
      const isTrash = TRASH_REGEX.test(`${item.topic} ${item.title}`);
      return hasSubtitles && isLongEnough && !isTrash;
    });

    // 3. Параллельный сбор реальных обложек
    const enriched = await Promise.all(
      filtered.map(async (item: any) => {
        const poster = await fetchPosterFast(item.url_website);
        if (!poster) return null; // Нет картинки -> в ленту не пускаем

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

    // 4. Устранение дубликатов серий и фильмов на одной странице
    const validItems = enriched.filter(Boolean);
    const uniqueMap = new Map();
    validItems.forEach((it: any) => {
      const simpleTitle = it.title.replace(/\s*\(S\d+.*\)/gi, '').split('-')[0].trim().toLowerCase();
      if (!uniqueMap.has(simpleTitle)) {
        uniqueMap.set(simpleTitle, it);
      }
    });

    const uniqueList = Array.from(uniqueMap.values()).slice(0, size);

    const finalItems = level === 'ALL'
      ? uniqueList
      : uniqueList.filter((it: any) => it.level === level);

    return NextResponse.json({
      items: finalItems,
      hasMore: rawResults.length >= 40,
    });
  } catch (error) {
    console.error('Mediathek error:', error);
    return NextResponse.json({ items: [], hasMore: false }, { status: 500 });
  }
}
