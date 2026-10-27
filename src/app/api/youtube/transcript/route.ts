import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { TranscriptItem } from '@/types/youtube';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function cleanSubtitleText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

async function fetchSubtitles(videoId: string): Promise<TranscriptItem[]> {
  let rawItems: Array<{ text: string; duration: number; offset: number; lang?: string }> = [];

  // 1. Try German ('de') transcript first
  try {
    rawItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'de' });
  } catch (deError: any) {
    // 2. Fallback to default / auto-generated transcript
    try {
      rawItems = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (fallbackError: any) {
      throw fallbackError || deError;
    }
  }

  if (!rawItems || rawItems.length === 0) {
    throw new Error('SUBTITLES_EMPTY');
  }

  // Convert offset & duration from milliseconds to seconds
  return rawItems.map((item) => ({
    text: cleanSubtitleText(item.text),
    start: Number((item.offset / 1000).toFixed(2)),
    duration: Number((item.duration / 1000).toFixed(2)),
  })).filter((item) => item.text.length > 0);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId')?.trim();

    if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
      return NextResponse.json(
        { error: 'Некорректный идентификатор YouTube видео (должен состоять ровно из 11 символов).' },
        { status: 400 }
      );
    }

    const transcript = await fetchSubtitles(videoId);

    return NextResponse.json(
      { transcript },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error: any) {
    const message = error?.message || '';
    console.error('API [transcript] error:', message);

    if (
      message.includes('Transcript is disabled') ||
      message.includes('No transcripts are available') ||
      message.includes('SUBTITLES_EMPTY')
    ) {
      return NextResponse.json(
        {
          error: 'У этого видео нет субтитров или автор их отключил. Пожалуйста, выберите другое видео.',
          code: 'TRANSCRIPT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (message.includes('The video is no longer available')) {
      return NextResponse.json(
        {
          error: 'Видео недоступно или было удалено с YouTube.',
          code: 'VIDEO_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (message.includes('too many requests') || message.includes('captcha')) {
      return NextResponse.json(
        {
          error: 'YouTube временно ограничил запросы к субтитрам. Попробуйте через пару минут.',
          code: 'RATE_LIMIT',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Не удалось загрузить субтитры из-за ошибки сети или сервиса YouTube.',
        details: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const videoId = body.videoId?.trim();

    if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
      return NextResponse.json(
        { error: 'Некорректный идентификатор YouTube видео (должен состоять ровно из 11 символов).' },
        { status: 400 }
      );
    }

    const transcript = await fetchSubtitles(videoId);
    return NextResponse.json({ transcript });
  } catch (error: any) {
    const message = error?.message || '';
    if (
      message.includes('Transcript is disabled') ||
      message.includes('No transcripts are available') ||
      message.includes('SUBTITLES_EMPTY')
    ) {
      return NextResponse.json(
        { error: 'У этого видео нет субтитров или автор их отключил.', code: 'TRANSCRIPT_NOT_FOUND' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Ошибка сервера при получении субтитров.', details: message },
      { status: 500 }
    );
  }
}
