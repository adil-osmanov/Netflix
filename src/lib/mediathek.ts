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
  } catch (e) {
    return cleanUrl;
  }
}

export * from './mediathekChannels';
