import { NextResponse } from 'next/server';
import { ALL_CHANNELS, normalizeSender, SENDER_API_MAP, determineGermanLevel } from '@/lib/mediathekChannels';

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

// Черный список: технические передачи, трейлеры, тифлокомментарии
const TRASH_REGEX =
  /(wetter|gottesdienst|audiodeskription|hörfassung|gebärdensprache|originalversion|rote rosen|sturm der liebe|in aller freundschaft|trailer|vorschau)/i;

const ogImageCache = new Map<string, string>();

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

// Быстрый парсер og:image (таймаут 1500 мс)
async function fetchPosterFast(url: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null;
  if (ogImageCache.has(url)) {
    return ogImageCache.get(url)!;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);

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

// Прямой запрос к MediathekViewWeb API
async function queryMediathekRaw(
  queries: Array<{ fields: string[]; query: string }>,
  offset: number,
  size: number
): Promise<any[]> {
  try {
    const response = await fetch('https://mediathekviewweb.de/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        queries,
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
  excludeSet: Set<string>,
  selectedChannel?: string
): any[] {
  // Для начальных уровней допускаем передачи от 3 минут (180с)
  const minDurationSec =
    level === 'A1' || level === 'A2'
      ? 180
      : category === 'films'
      ? 2400
      : category === 'docs'
      ? 900
      : 300;

  const targetChannelNorm =
    selectedChannel && selectedChannel !== 'all' && selectedChannel !== 'ALL'
      ? selectedChannel.toUpperCase()
      : null;

  const filtered = rawResults.filter((item: any) => {
    if (!item || typeof item.duration !== 'number' || item.duration < minDurationSec) {
      return false;
    }

    const itemId = item.id || `${item.timestamp}-${(item.title || '').slice(0, 15)}`;
    if (excludeSet.has(itemId) || (item.url_website && excludeSet.has(item.url_website))) {
      return false;
    }

    // Фильтр по выбранному телеканалу (сверка по ID)
    if (targetChannelNorm) {
      const itemNorm = normalizeSender(item.channel || '').toUpperCase();
      if (itemNorm !== targetChannelNorm) {
        return false;
      }
    }

    const fullText = `${item.topic || ''} ${item.title || ''}`;
    // Отсекаем мусорные передачи, но сохраняем новости на простом немецком (einfache sprache)
    if (TRASH_REGEX.test(fullText) && !fullText.toLowerCase().includes('einfache sprache')) {
      return false;
    }

    const looksLikeEpisode =
      category === 'series' ||
      /\b(?:S\d+|Staffel\s*\d+|Folge\s*\d+|Episode\s*\d+)/i.test(fullText);

    if (looksLikeEpisode && !isValidSeriesPilot(item.title || '', item.topic || '')) {
      return false;
    }

    // Точная детерминированная классификация уровня языка CEFR
    const itemLevel = determineGermanLevel({
      title: item.title || '',
      topic: item.topic || '',
      description: item.description || '',
      sender: item.channel || '',
      channel: item.channel || '',
      duration: item.duration || 0,
    });

    if (level !== 'ALL' && itemLevel !== level) {
      return false;
    }

    // Сохраняем вычисленный уровень
    item._computedLevel = itemLevel;

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
      channel = 'all',
      query = '',
      offset = 0,
      size = 24,
      excludeIds = [],
    } = await req.json();

    const cleanOffset = Math.max(0, Number(offset) || 0);
    const excludeSet = new Set<string>(Array.isArray(excludeIds) ? excludeIds : []);
    let rawResults: any[] = [];

    // Точный вещатель для API MediathekViewWeb
    const mappedSender =
      channel && channel !== 'all' && channel !== 'ALL'
        ? SENDER_API_MAP[channel] || channel
        : null;

    // 1. Формирование запросов к API MediathekViewWeb
    if (query && query.trim()) {
      // Пользовательский поиск
      const queries: any[] = [{ fields: ['title', 'topic'], query: query.trim() }];
      if (mappedSender) {
        queries.push({ fields: ['channel', 'sender'], query: mappedSender });
      }
      rawResults = await queryMediathekRaw(queries, cleanOffset, 70);
    } else if (level === 'A1' || level === 'A2') {
      // Для уровней A1 и A2 запрашиваем детский и адаптивный контент
      const aLevelKeywords =
        level === 'A1'
          ? ['Maus', 'Elefant', 'Sesamstraße', 'Sandmännchen', 'Einfache Sprache', 'Deutsch lernen']
          : ['Checker', 'Löwenzahn', 'logo!', 'Wissen macht Ah', 'pur+', 'Anna und die wilden Tiere'];

      const batchLists = await Promise.all(
        aLevelKeywords.map((kw) => {
          const queries: any[] = [{ fields: ['title', 'topic'], query: kw }];
          if (mappedSender) {
            queries.push({ fields: ['channel', 'sender'], query: mappedSender });
          }
          return queryMediathekRaw(queries, Math.floor(cleanOffset / 2), 25);
        })
      );
      rawResults = batchLists.flat();
    } else if (mappedSender) {
      // Выбран конкретный канал (ARTE, Phoenix, ONE, DW, ZDFneo и т.д.)
      if (category && category !== 'all' && CATEGORY_KEYWORDS[category]) {
        // Канал + выбранная подкатегория
        const catKw = CATEGORY_KEYWORDS[category].slice(0, 4);
        const batchLists = await Promise.all(
          catKw.map((kw) =>
            queryMediathekRaw(
              [
                { fields: ['channel', 'sender'], query: mappedSender },
                { fields: ['title', 'topic'], query: kw },
              ],
              Math.floor(cleanOffset / 2),
              25
            )
          )
        );
        rawResults = batchLists.flat();
      } else {
        // Запрос передач конкретного канала напрямую (без лишних ограничивающих слов)
        rawResults = await queryMediathekRaw(
          [{ fields: ['channel', 'sender'], query: mappedSender }],
          cleanOffset,
          60
        );
      }
    } else {
      // Общий каталог всех каналов
      const keywords = CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.all;
      const perKeywordOffset = Math.floor(cleanOffset / 2);
      const perKeywordSize = category === 'series' ? 35 : 25;

      const batchLists = await Promise.all(
        keywords.map((kw) =>
          queryMediathekRaw(
            [{ fields: ['title', 'topic'], query: kw }],
            perKeywordOffset,
            perKeywordSize
          )
        )
      );
      rawResults = batchLists.flat();
    }

    if (rawResults.length === 0) {
      return NextResponse.json(
        { items: [], hasMore: false },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // 2. Фильтрация и дедупликация кандидатов
    const candidates = filterAndDeduplicateCandidates(
      rawResults,
      category,
      level,
      excludeSet,
      channel
    );

    if (candidates.length === 0) {
      return NextResponse.json(
        { items: [], hasMore: false },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    const shuffledCandidates = shuffleArray(candidates);
    const enriched: any[] = [];
    const BATCH_SIZE = 12;

    // 3. Параллельный сбор обложек пачками: только РЕАЛЬНЫЕ обложки (без пустых заглушек!)
    for (let i = 0; i < shuffledCandidates.length && enriched.length < size; i += BATCH_SIZE) {
      const batch = shuffledCandidates.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (item: any) => {
          const realPoster = await fetchPosterFast(item.url_website);
          if (!realPoster || !realPoster.startsWith('http')) {
            return null;
          }

          const itemLevel =
            item._computedLevel ||
            determineGermanLevel({
              title: item.title || '',
              topic: item.topic || '',
              description: item.description || '',
              sender: item.channel || '',
              channel: item.channel || '',
              duration: item.duration || 0,
            });

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
            channel: item.channel || 'ARD',
            duration: Math.round(item.duration / 60),
            url_website: item.url_website,
            posterUrl: realPoster,
            thumbnailUrl: realPoster,
            level: itemLevel,
            date: new Date(item.timestamp * 1000).toLocaleDateString('de-DE'),
          };
        })
      );

      for (const res of batchResults) {
        if (res && enriched.length < size) {
          enriched.push(res);
        }
      }
    }

    const finalItems = shuffleArray(enriched);
    const hasMore = rawResults.length > 0 && finalItems.length > 0;

    return NextResponse.json(
      {
        items: finalItems,
        hasMore,
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
