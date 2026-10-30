/**
 * Утилиты для работы с YouTube метаданными
 */

export async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch {
    return null;
  }
}

export function isPlaceholderTitle(title?: string): boolean {
  if (!title) return true;
  const t = title.trim();
  if (t.startsWith("Easy German Video")) return true;
  if (/Easy German\s+[A-C][1-2]\s*\([a-zA-Z0-9_-]+\)/i.test(t)) return true;
  if (/Easy German\s+[A-C][1-2]\s*#\d+$/i.test(t)) return true;
  if (/\([a-zA-Z0-9_-]{8,15}\)/.test(t)) return true;
  return false;
}

export function formatDuration(secondsOrIso: number | string): string {
  if (typeof secondsOrIso === 'string') {
    // Если уже строка вида MM:SS или HH:MM:SS
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(secondsOrIso.trim())) {
      return secondsOrIso.trim();
    }

    // Если передана строка ISO формата (PT1M25S)
    const match = secondsOrIso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
  }

  const totalSeconds = Number(secondsOrIso);
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';

  const hours = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const channelNameMemoryCache = new Map<string, string>();

/**
 * Надежное получение имени канала через YouTube oEmbed и парсинг заголовка
 */
export async function resolveChannelName(videoId: string, title?: string): Promise<string> {
  if (!videoId) return "";
  const cleanId = videoId.trim();
  if (channelNameMemoryCache.has(cleanId)) {
    return channelNameMemoryCache.get(cleanId)!;
  }

  // 1. Попытка вытащить имя канала из официального oEmbed YouTube
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(cleanId)}&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.author_name && typeof data.author_name === "string") {
        const author = data.author_name.trim();
        if (
          author &&
          author.toLowerCase() !== "канал" &&
          author.toLowerCase() !== "undefined"
        ) {
          channelNameMemoryCache.set(cleanId, author);
          return author;
        }
      }
    }
  } catch {
    // игнорируем ошибку сети и переходим к парсингу заголовка
  }

  // 2. Если oEmbed не ответил, извлекаем канал из заголовка (например, "Тема видео | Название Канала")
  if (title && (title.includes("|") || title.includes(" - ") || title.includes(" – "))) {
    const parts = title.split(/[|\-–]/);
    const possibleChannel = parts[parts.length - 1].trim();
    if (
      possibleChannel.length > 1 &&
      possibleChannel.length < 35 &&
      possibleChannel.toLowerCase() !== "канал" &&
      possibleChannel.toLowerCase() !== "undefined"
    ) {
      channelNameMemoryCache.set(cleanId, possibleChannel);
      return possibleChannel;
    }
  }

  return "";
}

/**
 * Получение названия канала по его UC... ID через публичный RSS фид
 */
export async function resolveChannelTitleById(channelId: string): Promise<string> {
  if (!channelId || !channelId.startsWith("UC")) return "";
  const cleanId = channelId.trim();
  if (channelNameMemoryCache.has(cleanId)) {
    return channelNameMemoryCache.get(cleanId)!;
  }

  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(cleanId)}`
    );
    if (res.ok) {
      const xml = await res.text();
      const match =
        xml.match(/<author>\s*<name>([^<]+)<\/name>/i) ||
        xml.match(/<title>([^<]+)<\/title>/i);
      if (match?.[1]) {
        const title = match[1].trim();
        if (
          title &&
          title.toLowerCase() !== "канал" &&
          title.toLowerCase() !== "undefined"
        ) {
          channelNameMemoryCache.set(cleanId, title);
          return title;
        }
      }
    }
  } catch {}

  return "";
}

