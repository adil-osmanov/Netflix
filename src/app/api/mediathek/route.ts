import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Основные ключевые слова по категориям
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  all: ['Spielfilm', 'Dokumentation', 'Doku', 'Reportage', 'Terra X', 'Wissen'],
  films: ['Spielfilm', 'Fernsehfilm', 'Film', 'Kino', 'Thriller', 'Drama'],
  docs: ['Doku', 'Dokumentation', 'Reportage', 'Expedition', 'Geschichte', 'Natur'],
  series: ['S01/E01', 'Folge 1', 'Serie', 'Staffel', 'Miniserie'],
  knowledge: ['Wissen', 'Handwerk', 'Galileo', "c't", 'Terra X', 'Markt'],
};

// Расширенный пул тем для глубокого скролла (когда высокий offset исчерпывает основные запросы)
const CATEGORY_EXPANSION_KEYWORDS: Record<string, string[]> = {
  all: [
    'Arte', 'ZDFinfo', 'Kultur', 'Abenteuer', 'Gesellschaft', 'Krimi',
    'Natur', 'Technik', 'Geschichte', 'Komödie', 'Wissenschaft', 'Erde',
  ],
  films: [
    'Krimi', 'Komödie', 'Tatort', 'Polizeiruf', 'Liebesfilm',
    'Abenteuer', 'Romanze', 'Spielfilm', 'Fernsehfilm', 'Kino',
  ],
  docs: [
    'Terra X', 'Wissenschaft', 'Gesellschaft', 'Kultur', 'Erde',
    'Kosmos', 'Biografie', 'Archäologie', 'Technik', 'Abenteuer', 'Arte',
  ],
  series: [
    'Staffel 1', 'Episode 1', 'Teil 1', 'Folge 1', 'S01', 'Serie',
  ],
  knowledge: [
    'Quarks', 'Planet Wissen', 'Nano', 'Forschung', 'Gesundheit',
    'Psychologie', 'Ratgeber', 'Technik', 'Zukunft', 'Experiment',
  ],
};

// Специфические ключевые слова под начальные уровни A1 и A2 для поиска в медиатеке
const LEVEL_KEYWORDS_EXTRA: Record<string, string[]> = {
  A1: ['Die Sendung mit der Maus', 'Maus', 'Elefant', 'Kinder'],
  A2: ['logo!', 'Nachrichten für Kinder', 'Tiere', 'Märchen', 'Wissen'],
  C1: ['Arte Kino', 'Philosophie', 'Debatte', 'Kulturzeit', 'Aspekte'],
};

// Черный список: новости, ток-шоу, тифлокомментарии, оригинальные иноязычные дорожки, мыльные оперы
const TRASH_REGEX =
  /(tagesschau|heute-journal|heute journal|nachrichten|wetter|presseclub|talkshow|maischberger|markus lanz|hart aber fair|illner|kölner treff|riverboat|landesschau|abendschau|gottesdienst|audiodeskription|hörfassung|gebärdensprache|originalversion|rote rosen|sturm der liebe|in aller freundschaft|berlin direkt|morgenmagazin|mittagsmagazin|zeitzeugen|trailer|vorschau)/i;

const ogImageCache = new Map<string, string>();

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

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="%2318181b"/><rect width="640" height="360" fill="${encodeURIComponent(
    bg
  )}" opacity="0.35"/><text x="40" y="80" fill="%23ffffff" font-family="sans-serif" font-weight="900" font-size="28">${encodeURIComponent(
    safeChannel
  )}</text><text x="40" y="140" fill="%23e4e4e7" font-family="sans-serif" font-weight="bold" font-size="22">${encodeURIComponent(
    safeTopic
  )}</text></svg>`;
}

// Определение уровня программы по шкале CEFR (A1–C1)
export function detectMediathekLevel(
  channel: string,
  topic: string,
  title: string,
  durationSec: number = 0
): 'A1' | 'A2' | 'B1' | 'B2' | 'C1' {
  const combined = `${channel} ${topic} ${title}`.toLowerCase();

  // A1: Sendung mit der Maus, базовые детские передачи, медленный простой язык
  if (
    /\b(a1|maus|elefant|anfänger|slow german|erste schritte|grundstufe)\b/i.test(
      combined
    )
  ) {
    return 'A1';
  }

  // A2: Logo! (ZDF), легкий язык, короткие простые сюжеты, животные, сказки
  if (
    /\b(a2|logo!|leichte sprache|einfach|alltag|dialog|tiere|märchen|kinder)\b/i.test(
      combined
    )
  ) {
    return 'A2';
  }

  // C1: Arte, полнометражные фильмы, глубокие дискуссии, философия, наука, кино
  if (
    channel.toLowerCase().includes('arte') ||
    /\b(c1|c2|arte|kino|spielfilm|philosophie|debatte|politik|wissenschaft|literatur|theater|analyse|aspekte|krimi)\b/i.test(
      combined
    ) ||
    durationSec >= 3600
  ) {
    return 'C1';
  }

  // B2: аналитика, социальные темы, расследования, Terra X, ZDFinfo
  if (
    /\b(b2|terra x|zdfinfo|investigativ|geschichte|psychologie|zukunft|reportage|doku)\b/i.test(
      combined
    ) ||
    durationSec >= 2400
  ) {
    return 'B2';
  }

  // B1: повседневные репортажи (WDR, SWR Handwerkskunst, путешествия, ремесло, быт, рынок)
  return 'B1';
}

// ЖЕЛЕЗНОЕ ПРАВИЛО ДЛЯ СЕРИАЛОВ: только 1 сезон 1 серия (пилот) или основная страница сериала
function isValidSeriesPilot(title: string, topic: string): boolean {
  const combined = `${topic} ${title}`;

  if (/\(\s*S(?:0?[2-9]|[1-9]\d+)/i.test(combined)) return false;
  if (/\bS(?:0?[2-9]|[1-9]\d+)[/\s_-]*E\d+/i.test(combined)) return false;
  if (/\b(?:Staffel|Season)\s*(?:0?[2-9]|[1-9]\d+)\b/i.test(combined)) return false;

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
      html.match(
        /<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:image|twitter:image)["']/i
      );

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

function filterAndDeduplicateCandidates(
  rawResults: any[],
  category: string,
  level: string,
  excludeSet: Set<string>
): any[] {
  // Для A1/A2 допускаем передачи от 10 мин (600с), для остальных — стандартные пороги
  const minDurationSec =
    level === 'A1' || level === 'A2'
      ? 600
      : category === 'films'
      ? 2700
      : category === 'docs'
      ? 1200
      : 900;

  const filtered = rawResults.filter((item: any) => {
    if (!item || typeof item.duration !== 'number' || item.duration < minDurationSec) {
      return false;
    }

    const itemId = item.id || `${item.timestamp}-${(item.title || '').slice(0, 15)}`;
    if (excludeSet.has(itemId) || (item.url_website && excludeSet.has(item.url_website))) {
      return false;
    }

    const hasSubtitles = Boolean(
      (item.url_subtitles && item.url_subtitles.length > 5) ||
        (item.url_subtitle && item.url_subtitle.length > 5)
    );
    if (!hasSubtitles) return false;

    const fullText = `${item.topic || ''} ${item.title || ''}`;
    if (TRASH_REGEX.test(fullText)) return false;

    const looksLikeEpisode =
      category === 'series' ||
      /\b(?:S\d+|Staffel\s*\d+|Folge\s*\d+|Episode\s*\d+)/i.test(fullText);

    if (looksLikeEpisode && !isValidSeriesPilot(item.title || '', item.topic || '')) {
      return false;
    }

    const itemLevel = detectMediathekLevel(
      item.channel || 'ARD / ZDF',
      item.topic || '',
      item.title || '',
      item.duration || 0
    );
    if (level !== 'ALL' && itemLevel !== level) return false;

    return true;
  });

  const uniqueMap = new Map<string, any>();
  for (const item of filtered) {
    const rawTitle = (item.title || '').trim();
    const rawTopic = (item.topic || '').trim();

    let groupKey: string;
    if (category === 'series') {
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

  return Array.from(uniqueMap.values());
}

export async function POST(req: Request) {
  try {
    const {
      category = 'all',
      level = 'ALL',
      query = '',
      offset = 0,
      size = 24,
      excludeIds = [],
    } = await req.json();

    const cleanOffset = Math.max(0, Number(offset) || 0);
    const excludeSet = new Set<string>(Array.isArray(excludeIds) ? excludeIds : []);
    let rawResults: any[] = [];

    // 1. Получение данных из MediathekViewWeb с честным растущим оффсетом
    if (query && query.trim()) {
      rawResults = await queryMediathekKeyword(query.trim(), cleanOffset, 70, ['title', 'topic']);
    } else {
      let keywords = CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.all;
      // Если выбран специфический уровень A1 или A2, добавляем ключевые слова для детского/легкого немецкого
      if (LEVEL_KEYWORDS_EXTRA[level]) {
        keywords = [...keywords, ...LEVEL_KEYWORDS_EXTRA[level]];
      }

      const perKeywordOffset = Math.floor(cleanOffset / 2);
      const perKeywordSize = category === 'series' ? 40 : 28;

      const batchLists = await Promise.all(
        keywords.map((kw) => queryMediathekKeyword(kw, perKeywordOffset, perKeywordSize))
      );
      rawResults = batchLists.flat();
    }

    let candidates = filterAndDeduplicateCandidates(rawResults, category, level, excludeSet);

    // 2. Если на высоком оффсете кандидатов мало — плавно расширяем тему запроса!
    if (!query?.trim() && candidates.length < size) {
      let expansionPool =
        CATEGORY_EXPANSION_KEYWORDS[category] || CATEGORY_EXPANSION_KEYWORDS.all;
      if (LEVEL_KEYWORDS_EXTRA[level]) {
        expansionPool = [...expansionPool, ...LEVEL_KEYWORDS_EXTRA[level]];
      }

      const step = Math.floor(cleanOffset / 24);
      const pickedExpansion = [
        expansionPool[step % expansionPool.length],
        expansionPool[(step + 1) % expansionPool.length],
        expansionPool[(step + 2) % expansionPool.length],
        expansionPool[(step + 3) % expansionPool.length],
      ];
      const expOffset = (step * 15) % 120;

      const expLists = await Promise.all(
        pickedExpansion.map((kw) => queryMediathekKeyword(kw, expOffset, 35))
      );
      const combinedRaw = [...rawResults, ...expLists.flat()];
      candidates = filterAndDeduplicateCandidates(combinedRaw, category, level, excludeSet);
      rawResults = combinedRaw;
    }

    const shuffledCandidates = shuffleArray(candidates);
    const slicedCandidates = shuffledCandidates.slice(0, size);

    // 3. Параллельный сбор обложек (с SVG фоллбеком за 800 мс — без выбрасывания роликов!)
    const enriched = await Promise.all(
      slicedCandidates.map(async (item: any) => {
        const realPoster = await fetchPosterFast(item.url_website);
        const poster =
          realPoster || getFallbackPoster(item.channel || 'ARD / ZDF', item.topic || category);

        const itemLevel = detectMediathekLevel(
          item.channel || 'ARD / ZDF',
          item.topic || '',
          item.title || '',
          item.duration || 0
        );

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
          level: itemLevel,
          date: new Date(item.timestamp * 1000).toLocaleDateString('de-DE'),
        };
      })
    );

    const finalItems = shuffleArray(enriched);

    return NextResponse.json(
      {
        items: finalItems,
        hasMore: rawResults.length > 0 || finalItems.length > 0,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
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
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
