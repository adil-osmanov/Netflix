import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { TranscriptItem } from '@/types/youtube';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const INVIDIOUS_INSTANCES = [
  'https://yt.chocolatemoo53.com',
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.einfachzocken.eu',
  'https://yewtu.be',
];

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.leptons.xyz',
  'https://cf.pipedapi.kavin.rocks',
];

function cleanSubtitleText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/<[^>]+>/g, '') // Strip WebVTT/HTML tags like <c>, <00:00:01.000>
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Universal parser for WebVTT and SRT caption formats
 */
function parseVttOrSrtToTranscript(content: string): TranscriptItem[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const items: TranscriptItem[] = [];

  let currentStart = 0;
  let currentEnd = 0;
  let currentTextLines: string[] = [];

  // Match 00:00:01.960 --> 00:00:05.430 or 00:01.960 --> 00:05.430
  const timeRegex = /(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})/;

  function parseTime(hours?: string, mins?: string, secs?: string, ms?: string): number {
    const h = hours ? parseInt(hours, 10) : 0;
    const m = mins ? parseInt(mins, 10) : 0;
    const s = secs ? parseInt(secs, 10) : 0;
    const mill = ms ? parseInt(ms, 10) : 0;
    return h * 3600 + m * 60 + s + mill / 1000;
  }

  function flush() {
    if (currentTextLines.length > 0 && currentEnd > currentStart) {
      const clean = cleanSubtitleText(currentTextLines.join(' '));
      const duration = Number((currentEnd - currentStart).toFixed(2));
      // Filter out empty lines or micro-glitch artifacts (< 0.2s)
      if (clean && duration >= 0.2) {
        items.push({
          text: clean,
          start: Number(currentStart.toFixed(2)),
          duration,
        });
      }
    }
    currentTextLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed === 'WEBVTT' ||
      trimmed.startsWith('Kind:') ||
      trimmed.startsWith('Language:') ||
      trimmed.startsWith('NOTE')
    ) {
      continue;
    }

    const match = trimmed.match(timeRegex);
    if (match) {
      flush();
      currentStart = parseTime(match[1], match[2], match[3], match[4]);
      currentEnd = parseTime(match[5], match[6], match[7], match[8]);
    } else if (currentEnd > 0 && !/^\d+$/.test(trimmed)) {
      currentTextLines.push(trimmed);
    }
  }
  flush();

  return items;
}

/**
 * 1. Primary Method: Multi-level search via youtube-transcript
 */
async function fetchViaYoutubeTranscript(videoId: string): Promise<TranscriptItem[]> {
  const languagePriorities = ['de', 'de-DE', 'de-AT', 'de-CH', undefined];
  let lastError: any = null;

  for (const lang of languagePriorities) {
    try {
      console.log(`[Transcript API] Trying youtube-transcript for ${videoId} with lang: ${lang || 'default'}...`);
      const rawItems = await YoutubeTranscript.fetchTranscript(
        videoId,
        lang ? { lang } : undefined
      );

      if (rawItems && rawItems.length > 0) {
        console.log(`[Transcript API] Success with youtube-transcript (lang: ${lang || 'default'}), items: ${rawItems.length}`);
        return rawItems
          .map((item) => ({
            text: cleanSubtitleText(item.text),
            start: Number((item.offset / 1000).toFixed(2)),
            duration: Number((item.duration / 1000).toFixed(2)),
          }))
          .filter((item) => item.text.length > 0);
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Transcript API] youtube-transcript (${lang || 'default'}) failed:`, err?.message || err);
    }
  }

  throw lastError || new Error('No transcripts returned from youtube-transcript');
}

/**
 * 2. Fallback: Public Invidious API
 */
async function fetchViaInvidious(videoId: string): Promise<TranscriptItem[]> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      console.log(`[Transcript API] Fallback: Trying Invidious (${base}) for ${videoId}...`);
      const res = await fetch(`${base}/api/v1/captions/${videoId}`, {
        signal: AbortSignal.timeout(4500),
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });

      if (!res.ok) {
        console.warn(`[Transcript API] Invidious instance ${base} returned status: ${res.status}`);
        continue;
      }

      const data = await res.json();
      if (!data.captions || !Array.isArray(data.captions) || data.captions.length === 0) {
        continue;
      }

      // Prioritize German subtitle track
      const track =
        data.captions.find(
          (c: any) =>
            c.languageCode?.toLowerCase().startsWith('de') ||
            c.label?.toLowerCase().includes('german') ||
            c.label?.toLowerCase().includes('deutsch')
        ) || data.captions[0];

      if (!track?.url) continue;

      const fullUrl = track.url.startsWith('http') ? track.url : `${base}${track.url}`;
      console.log(`[Transcript API] Downloading VTT from Invidious: ${fullUrl}`);

      const vttRes = await fetch(fullUrl, { signal: AbortSignal.timeout(4500) });
      if (!vttRes.ok) continue;

      const vttText = await vttRes.text();
      const parsedItems = parseVttOrSrtToTranscript(vttText);

      if (parsedItems.length > 0) {
        console.log(`[Transcript API] Successfully parsed ${parsedItems.length} subtitles from Invidious (${base})`);
        return parsedItems;
      }
    } catch (err: any) {
      console.warn(`[Transcript API] Invidious ${base} error:`, err?.message || err);
    }
  }

  throw new Error('All Invidious fallback instances failed');
}

/**
 * 3. Fallback: Public Piped API
 */
async function fetchViaPiped(videoId: string): Promise<TranscriptItem[]> {
  for (const base of PIPED_INSTANCES) {
    try {
      console.log(`[Transcript API] Fallback: Trying Piped (${base}) for ${videoId}...`);
      const res = await fetch(`${base}/streams/${videoId}`, {
        signal: AbortSignal.timeout(4500),
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });

      if (!res.ok) {
        console.warn(`[Transcript API] Piped instance ${base} returned status: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const subs = data.subtitles;
      if (!subs || !Array.isArray(subs) || subs.length === 0) {
        continue;
      }

      // Prioritize German subtitle track
      const track =
        subs.find(
          (s: any) =>
            s.code?.toLowerCase().startsWith('de') ||
            s.name?.toLowerCase().includes('german') ||
            s.name?.toLowerCase().includes('deutsch')
        ) || subs[0];

      if (!track?.url) continue;

      console.log(`[Transcript API] Downloading subtitle from Piped: ${track.url}`);
      const subRes = await fetch(track.url, { signal: AbortSignal.timeout(4500) });
      if (!subRes.ok) continue;

      const subText = await subRes.text();
      const parsedItems = parseVttOrSrtToTranscript(subText);

      if (parsedItems.length > 0) {
        console.log(`[Transcript API] Successfully parsed ${parsedItems.length} subtitles from Piped (${base})`);
        return parsedItems;
      }
    } catch (err: any) {
      console.warn(`[Transcript API] Piped ${base} error:`, err?.message || err);
    }
  }

  throw new Error('All Piped fallback instances failed');
}

/**
 * Main transcript orchestrator
 */
async function getTranscript(videoId: string): Promise<TranscriptItem[]> {
  const errors: string[] = [];

  // Step 1: Multi-level youtube-transcript
  try {
    return await fetchViaYoutubeTranscript(videoId);
  } catch (err: any) {
    const msg = `Primary (youtube-transcript) failed: ${err?.message || err}`;
    console.warn(msg);
    errors.push(msg);
  }

  // Step 2: Fallback to Invidious
  try {
    return await fetchViaInvidious(videoId);
  } catch (err: any) {
    const msg = `Fallback 1 (Invidious) failed: ${err?.message || err}`;
    console.warn(msg);
    errors.push(msg);
  }

  // Step 3: Fallback to Piped
  try {
    return await fetchViaPiped(videoId);
  } catch (err: any) {
    const msg = `Fallback 2 (Piped) failed: ${err?.message || err}`;
    console.warn(msg);
    errors.push(msg);
  }

  console.error(`[Transcript API] All methods exhausted for videoId: ${videoId}`, errors);
  throw new Error(
    `Субтитры недоступны для этого видео (или YouTube ограничил доступ). Подробности: ${errors.join('; ')}`
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId')?.trim();

    if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
      return NextResponse.json(
        {
          error: 'Некорректный идентификатор YouTube видео (должен состоять ровно из 11 символов).',
          details: 'Invalid videoId parameter',
        },
        { status: 400 }
      );
    }

    const transcript = await getTranscript(videoId);

    return NextResponse.json(
      { transcript },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error: any) {
    const message = error?.message || 'Неизвестная ошибка';
    console.error(`[Transcript API GET error]:`, message);

    const isNotFound =
      message.includes('Transcript is disabled') ||
      message.includes('No transcripts') ||
      message.includes('All Invidious') ||
      message.includes('All Piped');

    return NextResponse.json(
      {
        error: isNotFound
          ? 'У этого видео нет доступных субтитров или YouTube заблокировал доступ к ним. Пожалуйста, попробуйте другое видео.'
          : 'Не удалось получить субтитры из-за ошибки сети.',
        details: message,
      },
      { status: isNotFound ? 404 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const videoId = body.videoId?.trim();

    if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
      return NextResponse.json(
        {
          error: 'Некорректный идентификатор YouTube видео (должен состоять ровно из 11 символов).',
          details: 'Invalid videoId parameter',
        },
        { status: 400 }
      );
    }

    const transcript = await getTranscript(videoId);
    return NextResponse.json({ transcript });
  } catch (error: any) {
    const message = error?.message || 'Неизвестная ошибка';
    console.error(`[Transcript API POST error]:`, message);

    return NextResponse.json(
      {
        error: 'Не удалось получить субтитры.',
        details: message,
      },
      { status: 500 }
    );
  }
}
