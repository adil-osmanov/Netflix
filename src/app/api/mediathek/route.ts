import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Ключевые слова по категориям для широкого параллельного охвата MediathekViewWeb
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  all: ['Spielfilm', 'Dokumentation', 'Doku', 'Reportage', 'Terra X', 'Wissen'],
  films: ['Spielfilm', 'Fernsehfilm', 'Film', 'Kino', 'Thriller', 'Drama'],
  docs: ['Doku', 'Dokumentation', 'Reportage', 'Expedition', 'Geschichte', 'Natur'],
  series: ['S01/E01', 'Folge 1', 'Serie', 'Staffel', 'Miniserie'],
  knowledge: ['Wissen', 'Handwerk', 'Galileo', "c't", 'Terra X', 'Markt'],
};

// Черный список: новости, ток-шоу, тифлокомментарии, оригинальные иноязычные дорожки, мыльные оперы
const TRASH_REGEX = /(tagesschau|heute-journal|heute journal|nachrichten|wetter|presseclub|talkshow|maischberger|markus lanz|hart aber fair|illner|kölner treff|riverboat|landesschau|abendschau|gottesdienst|audiodeskription|hörfassung|gebärdensprache|originalversion|rote rosen|sturm der liebe|in aller freundschaft|berlin direkt|morgenmagazin|mittagsmagazin|zeitzeugen|trailer|vorschau)/i;

const ogImageCache = new Map<string, string>();

// Честное перемешивание (Fisher-Yates Shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Стильный брендовый постер-заглушка (SVG Data-URI) с градиентом и логотипом канала
export function getFallbackPoster(channel: string, topic: string): string {
  const ch = channel || 'ARD / ZDF';
  const bg = ch.toUpperCase().includes('ZDF')
    ? '#e05a10'
    : ch.toUpperCase().includes('ARTE')
    ? '#c82828'
    : '#003366';

  const safeChannel = ch.replace(/[<>&"']/g, '');
  const safeTopic = (topic || 'Mediathek').slice(0, 35).replace(/[<>&"']/g, '');

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="%2318181b"/><rect width="640" height="360" fill="${encodeURIComponent(bg)}" opacity="0.35"/><text x="40" y="80" fill="%23ffffff" font-family="sans-serif" font-weight="900" font-size="28">${encodeURIComponent(safeChannel)}</text><text x="40" y="140" fill="%23e4e4e7" font-family="sans-serif" font-weight="bold" font-size="22">${encodeURIComponent(safeTopic)}</text></svg>`;
}

// ЖЕЛЕЗНОЕ ПРАВИЛО ДЛЯ СЕРИАЛОВ: только 1 сезон 1 серия (пилот) или основная страница сериала
function isValidSeriesPilot(title: string, topic: string): boolean {
  const combined = `${topic} ${title}`;

  // 1. Исключаем любые сезоны >= 2: (S02, S03, Staffel 2, Staffel 3, Season 2...
  if (/\(\s*S(?:0?[2-9]|[1-9]\d+)/i.test(combined)) return false;
  if (/\bS(?:0?[2-9]|[1-9]\d+)[/\s_-]*E\d+/i.test(combined)) return false;
  if (/\b(?:Staffel|Season)\s*(?:0?[2-9]|[1-9]\d+)\b/i.test(combined)) return false;

  // 2. Исключаем любые серии >= 2: E02, E03, Folge 2, Folge 3, Teil 2, (02/), (2/), (2)...
  if (/[/\s_(-]E(?:0?[2-9]|[1-9]\d+)\b/i.test(combined)) return false;
  if (/\b(?:Folge|Episode|Teil)\s*(?:0?[2-9]|[1-9]\d+)\b/i.test(combined)) return false;
  if (/\(\s*(?:0?[2-9]|[1-9]\d+)\s*(?:\/\s*\d+)?\s*\)/.test(combined)) return false;

  return true;
}

// Быстрый парсер og:image (таймаут строго 800 мс)
async function fetchPosterFast(url: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null;
  if (ogImageCache.has(url)) {
    return ogImageCache.get(url)!;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 800);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 86400 },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:image|twitter:image)["']/i);

    let img = match && match[1] ? match[1].trim() : null;

    if (!img) {
      const zdfMatch =
        html.match(/"dim1280X720":\s*"([^"]+)"/i) || html.match(/"dim1920X1080":\s*"([^"]+)"/i);
      if (zdfMatch && zdfMatch[1]) {
        img = zdfMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/').trim();
      } else {
        const ardMatch = html.match(
          /(https?:\/\/[^"'\s]*api\.ardmediathek\.de\/image-service[^"'\s]*)/i
        );
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

async function queryMediathekKeyword(
  keyword: string,
  offset: number,
  size: number,
  fields: string[] = ['topic', 'title']
): Promise<any[]> {
  try {
    const response = await fetch('https://mediathekviewweb.de/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        queries: [{ fields, query: keyword }],
        sortBy: 'timestamp',
        sortOrder: 'desc',
        future: false,
        offset,
        size,
      }),
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.result?.results || [];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const {
      category = 'all',
      level = 'ALL',
      query = '',
      offset = 0,
      size = 24,
    } = await req.json();

    const cleanOffset = Math.max(0, Number(offset) || 0);
    let rawResults: any[] = [];

    // 1. Получение данных из MediathekViewWeb с честным оффсетом
    if (query && query.trim()) {
      rawResults = await queryMediathekKeyword(query.trim(), cleanOffset, 60, ['title', 'topic']);
    } else {
      const keywords = CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.all;
      // Честный шаг пагинации по каждому ключевому слову пула
      const perKeywordOffset = Math.floor(cleanOffset / 2);
      const perKeywordSize = category === 'series' ? 35 : 22;

      const batchLists = await Promise.all(
        keywords.map((kw) => queryMediathekKeyword(kw, perKeywordOffset, perKeywordSize))
      );
      rawResults = batchLists.flat();
    }

    // 2. Хронометраж по категориям:
    // films >= 45 мин (2700с), docs >= 20 мин (1200с), series/knowledge/all >= 15-20 мин
    const minDurationSec =
      category === 'films'
        ? 2700
        : category === 'docs'
        ? 1200
        : 900;

    // 3. Фильтрация мусора, субтитров и правила «1 сезон 1 серия»
    const filtered = rawResults.filter((item: any) => {
      if (!item || typeof item.duration !== 'number' || item.duration < minDurationSec) {
        return false;
      }

      const hasSubtitles = Boolean(
        (item.url_subtitles && item.url_subtitles.length > 5) ||
          (item.url_subtitle && item.url_subtitle.length > 5)
      );
      if (!hasSubtitles) return false;

      const fullText = `${item.topic || ''} ${item.title || ''}`;
      if (TRASH_REGEX.test(fullText)) return false;

      // Железное правило «1 сезон 1 серия» для сериалов (и любых эпизодических шоу)
      const looksLikeEpisode =
        category === 'series' ||
        /\b(?:S\d+|Staffel\s*\d+|Folge\s*\d+|Episode\s*\d+)/i.test(fullText);

      if (looksLikeEpisode && !isValidSeriesPilot(item.title || '', item.topic || '')) {
        return false;
      }

      return true;
    });

    // 4. Дедупликация и группировка (для сериалов — строго 1 пилот на сериал)
    const uniqueMap = new Map<string, any>();
    for (const item of filtered) {
      const rawTitle = (item.title || '').trim();
      const rawTopic = (item.topic || '').trim();

      let groupKey: string;
      if (category === 'series') {
        // Группируем строго по названию сериала (topic или основа заголовка)
        groupKey = (
          rawTopic ||
          rawTitle
            .replace(/\s*\(S\d+.*\)/gi, '')
            .replace(/Folge\s*\d+[:\s-]*/gi, '')
            .split('-')[0]
        )
          .trim()
          .toLowerCase();
      } else {
        groupKey = rawTitle
          .replace(/\s*\(S\d+.*\)/gi, '')
          .replace(/\s*\(Folge\s*\d+.*\)/gi, '')
          .split('-')[0]
          .trim()
          .toLowerCase();
      }

      if (!groupKey) continue;
      if (!uniqueMap.has(groupKey)) {
        uniqueMap.set(groupKey, item);
      }
    }

    // 5. Перемешиваем кандидатов (Fisher-Yates) и берем нужный размер пачки
    const uniqueCandidates = shuffleArray(Array.from(uniqueMap.values()));

    // Фильтрация по уровню B1/B2 до обогащения обложками, чтобы отдать полную пачку
    const levelMatchedCandidates = uniqueCandidates.filter((item: any) => {
      const isB1 =
        item.duration < 2100 ||
        /einfach|alltag|wissen|reise|handwerk|natur|markt/i.test(`${item.topic} ${item.title}`);
      const itemLevel = isB1 ? 'B1' : 'B2';
      return level === 'ALL' || itemLevel === level;
    });

    const slicedCandidates = levelMatchedCandidates.slice(0, size);

    // 6. Параллельный сбор обложек (с фоллбек-постером, без выбрасывания карточек!)
    const enriched = await Promise.all(
      slicedCandidates.map(async (item: any) => {
        const realPoster = await fetchPosterFast(item.url_website);
        const poster = realPoster || getFallbackPoster(item.channel || 'ARD / ZDF', item.topic || category);

        const isB1 =
          item.duration < 2100 ||
          /einfach|alltag|wissen|reise|handwerk|natur|markt/i.test(`${item.topic} ${item.title}`);

        // Для сериалов делаем заголовок максимально понятным (Название сериала + Пилот)
        let displayTitle = item.title || '';
        if (
          category === 'series' &&
          item.topic &&
          !displayTitle.toLowerCase().includes(item.topic.toLowerCase())
        ) {
          displayTitle = `${item.topic}: ${displayTitle}`;
        }

        return {
          id: item.id || `${item.timestamp}-${(item.title || '').slice(0, 15)}`,
          title: displayTitle,
          topic: item.topic || '',
          channel: item.channel || 'ARD / ZDF',
          duration: Math.round(item.duration / 60),
          url_website: item.url_website,
          posterUrl: poster,
          thumbnailUrl: poster,
          level: isB1 ? 'B1' : 'B2',
          date: new Date(item.timestamp * 1000).toLocaleDateString('de-DE'),
        };
      })
    );

    const finalItems = shuffleArray(enriched);

    return NextResponse.json(
      {
        items: finalItems,
        hasMore: rawResults.length > 0,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Mediathek error:', error);
    return NextResponse.json(
      { items: [], hasMore: false },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}
