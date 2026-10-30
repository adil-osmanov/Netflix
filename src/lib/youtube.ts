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
