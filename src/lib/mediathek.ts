/**
 * Утилиты и методы API для работы с MediathekViewWeb
 */

/**
 * Нормализация и санитайзинг ссылок на изображения Mediathek
 */
export function sanitizeThumbnailUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  let cleanUrl = url.trim();

  if (!cleanUrl || cleanUrl.length < 10) return null;

  // 1. Исправляем ссылки без протокола (//api-cdn.arte.tv -> https://api-cdn.arte.tv)
  if (cleanUrl.startsWith('//')) {
    cleanUrl = `https:${cleanUrl}`;
  } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }

  // 2. Исправляем небезопасный HTTP на HTTPS для предотвращения Mixed Content
  if (cleanUrl.startsWith('http://')) {
    cleanUrl = cleanUrl.replace('http://', 'https://');
  }

  // 3. Экранируем пробелы и специальные символы в URL
  try {
    return encodeURI(decodeURI(cleanUrl));
  } catch {
    return cleanUrl;
  }
}

/**
 * Точная карта запросов для MediathekViewWeb API по вещателям
 */
export function buildChannelQuery(channelId: string): Array<{ fields: string[]; query: string }> {
  const ch = channelId.toUpperCase();

  switch (ch) {
    case 'ARTE':
      // В MediathekView немецкий Arte всегда имеет sender 'Arte.de'
      return [{ fields: ['channel', 'sender'], query: 'Arte.de' }];

    case 'PHOENIX':
      // Строго в верхнем регистре
      return [{ fields: ['channel', 'sender'], query: 'PHOENIX' }];

    case 'ZDFNEO':
    case 'ZDF_NEO':
      // Канал ZDFneo в базе
      return [{ fields: ['channel', 'sender'], query: 'ZDFneo' }];

    case '3SAT':
      return [{ fields: ['channel', 'sender'], query: '3Sat' }];

    case 'ONE':
      // Канал ONE в базе MediathekView
      return [{ fields: ['channel', 'sender'], query: 'ONE' }];

    case 'DW':
      // Deutsche Welle часто идет под именем DW
      return [{ fields: ['channel', 'sender', 'topic', 'title'], query: 'DW' }];

    case 'KIKA':
      return [{ fields: ['channel', 'sender'], query: 'KiKA' }];

    default:
      return [{ fields: ['channel', 'sender'], query: channelId }];
  }
}

/**
 * Запрос к API MediathekViewWeb с пагинацией и валидацией изображений
 */
export async function fetchMediathekVideos({
  channelId = 'all',
  page = 0,
  size = 24,
}: {
  channelId?: string;
  page?: number;
  size?: number;
}) {
  const queries: Array<{ fields: string[]; query: string }> = [];

  if (channelId && channelId !== 'all') {
    queries.push(...buildChannelQuery(channelId));
  }

  try {
    const res = await fetch('https://mediathekviewweb.de/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        queries,
        sortBy: 'timestamp',
        sortOrder: 'desc',
        future: false,
        offset: page * size,
        size,
      }),
      cache: 'no-store',
    });

    if (!res.ok) return { videos: [], hasMore: false };

    const data = await res.json();
    const results = data?.result?.results || [];

    // Фильтруем видео без картинок (решает проблему черных карточек у SR)
    const validVideos = results.filter((item: any) => {
      const thumb = sanitizeThumbnailUrl(item.imgUrl || item.thumbnail || item.preview_url);
      return thumb && typeof thumb === 'string' && thumb.trim().startsWith('http');
    });

    return {
      videos: validVideos,
      hasMore: results.length >= size,
    };
  } catch (err) {
    console.error('Ошибка Mediathek API:', err);
    return { videos: [], hasMore: false };
  }
}

export * from './mediathekChannels';
