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
