import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Белый список проверенных премиальных программ с идеальным визуалом и дикцией
const CURATED_DOCS = [
  'Terra X',
  'ZDFinfo',
  'Arte Doku',
  'WDR die story',
  'ZDFzoom',
  'Planet Wissen'
];

const CURATED_FILMS = [
  'Film im Ersten',
  'ZDF Fernsehfilm der Woche',
  'Arte Kino',
  'Spielfilm'
];

// Черный список: ток-шоу, архивные беседы, региональные хроники
const BLACKLIST_REGEX = /(zeitzeugen|talkshow|talk|gottesdienst|regional|magazin|nachrichten|wetter|sport|presseclub|landesschau|aktuell|markt|service)/i;

const ogImageCache = new Map<string, string>();

async function fetchFastOgImage(url: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null;
  if (ogImageCache.has(url)) {
    return ogImageCache.get(url)!;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200); // Строгий таймаут 1.2 сек

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 86400 } // Кэш на 24 часа
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:image|twitter:image)["']/i);

    let poster = match ? match[1] : null;

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
      ogImageCache.set(url, poster);
      return poster;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { offset = 0, size = 30, category = 'ALL', level = 'ALL', query = '' } = await req.json();

    const queries: Array<{ fields: string[]; query: string }> = [];

    if (query) {
      queries.push({ fields: ['title', 'topic'], query });
    } else if (category === 'doku' || category === 'docs') {
      // Ротация конкретной топовой передачи вместо кучи слов через пробел
      const topic = CURATED_DOCS[Math.floor(Math.random() * CURATED_DOCS.length)];
      queries.push({ fields: ['topic'], query: topic });
    } else if (category === 'films') {
      const filmTopic = CURATED_FILMS[Math.floor(Math.random() * CURATED_FILMS.length)];
      queries.push({ fields: ['topic'], query: filmTopic });
    } else if (category === 'series') {
      queries.push({ fields: ['topic'], query: 'Serie' });
    } else {
      // Для вкладки «Все» берем топовый познавательный контент
      const allPool = [...CURATED_DOCS, ...CURATED_FILMS];
      const randomSelected = allPool[Math.floor(Math.random() * allPool.length)];
      queries.push({ fields: ['topic'], query: randomSelected });
    }

    const payload = {
      queries,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      future: false,
      offset: query ? offset : Math.floor(Math.random() * 15) * 10 + offset, // Случайный сдвиг для разнообразия
      size: 40,
    };

    const response = await fetch('https://mediathekviewweb.de/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('API Mediathek error');
    const data = await response.json();
    const rawResults = data.result?.results || [];

    // Фильтруем мусор и ток-шоу
    const cleaned = rawResults.filter((item: any) => {
      const isSubtitled = Boolean(
        (item.url_subtitles && item.url_subtitles.length > 5) ||
        (item.url_subtitle && item.url_subtitle.length > 5)
      );
      const isLongEnough = item.duration >= 900; // от 15 минут
      const isNotTrash = !BLACKLIST_REGEX.test(`${item.topic} ${item.title}`);
      return isSubtitled && isLongEnough && isNotTrash;
    });

    // Параллельный сбор превью с жестким лимитом
    const enriched = await Promise.all(
      cleaned.slice(0, size).map(async (item: any) => {
        let poster = await fetchFastOgImage(item.url_website);

        // Если страница не отдала постер, исключаем полностью
        if (!poster) {
          return null; // Нет нормальной обложки -> исключаем полностью
        }

        const isB1 = item.duration < 1800 || /einfach|alltag|wissen/i.test(`${item.topic} ${item.title}`);

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

    // Удаляем null (без картинок) и дубликаты по названию
    const validItems = enriched.filter(Boolean);
    const uniqueMap = new Map();
    validItems.forEach((it: any) => {
      const simpleTitle = it.title.split('-')[0].trim().toLowerCase();
      if (!uniqueMap.has(simpleTitle)) {
        uniqueMap.set(simpleTitle, it);
      }
    });

    const finalItems = Array.from(uniqueMap.values());

    return NextResponse.json({
      items: level === 'ALL' ? finalItems : finalItems.filter((i: any) => i.level === level),
      hasMore: rawResults.length >= size,
    });
  } catch (error) {
    console.error('Mediathek route error:', error);
    return NextResponse.json({ items: [], hasMore: false }, { status: 500 });
  }
}
