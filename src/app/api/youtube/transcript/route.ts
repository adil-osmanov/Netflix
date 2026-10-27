import { NextRequest, NextResponse } from "next/server";
import { TranscriptItem } from "@/types/youtube";

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const INNERTUBE_CLIENT_VERSION = "20.10.38";
const INNERTUBE_CONTEXT = {
  client: {
    clientName: "ANDROID",
    clientVersion: INNERTUBE_CLIENT_VERSION,
  },
};
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

const INVIDIOUS_INSTANCES = [
  "https://yt.chocolatemoo53.com",
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.einfachzocken.eu",
  "https://yewtu.be",
];

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
  "https://piped-api.garudalinux.org",
  "https://pipedapi.leptons.xyz",
];

function cleanSubtitleText(rawText: string): string {
  if (!rawText) return "";
  return rawText
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Universal XML parser for YouTube timedtext formats:
 * Format 3: <p t="7550" d="1015">Text</p> (milliseconds)
 * Format 1: <text start="7.55" dur="1.01">Text</text> (seconds)
 */
function parseTimedTextXml(xml: string): TranscriptItem[] {
  const items: TranscriptItem[] = [];

  // 1. Try Format 3: <p t="startMs" d="durMs">
  const pMatches = [...xml.matchAll(/<p t="(\d+)" d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g)];
  if (pMatches.length > 0) {
    for (const match of pMatches) {
      const startMs = parseInt(match[1], 10);
      const durMs = parseInt(match[2], 10);
      const clean = cleanSubtitleText(match[3]);
      if (clean && durMs >= 200) {
        items.push({
          text: clean,
          start: Number((startMs / 1000).toFixed(2)),
          duration: Number((durMs / 1000).toFixed(2)),
        });
      }
    }
    return items;
  }

  // 2. Try Format 1: <text start="startSec" dur="durSec">
  const textMatches = [...xml.matchAll(/<text start="([^"]*)" dur="([^"]*)"[^>]*>([\s\S]*?)<\/text>/g)];
  if (textMatches.length > 0) {
    for (const match of textMatches) {
      const start = parseFloat(match[1]);
      const dur = parseFloat(match[2]);
      const clean = cleanSubtitleText(match[3]);
      if (clean && dur >= 0.2) {
        items.push({
          text: clean,
          start: Number(start.toFixed(2)),
          duration: Number(dur.toFixed(2)),
        });
      }
    }
  }

  return items;
}

/**
 * Universal parser for WebVTT and SRT caption formats
 */
function parseVttOrSrtToTranscript(content: string): TranscriptItem[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const items: TranscriptItem[] = [];

  let currentStart = 0;
  let currentEnd = 0;
  let currentTextLines: string[] = [];

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
      const clean = cleanSubtitleText(currentTextLines.join(" "));
      const duration = Number((currentEnd - currentStart).toFixed(2));
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
      trimmed === "WEBVTT" ||
      trimmed.startsWith("Kind:") ||
      trimmed.startsWith("Language:") ||
      trimmed.startsWith("NOTE")
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
 * 1. Primary Method: Fetch strictly manual German subtitles via InnerTube API
 */
async function fetchViaInnerTube(videoId: string): Promise<TranscriptItem[]> {
  const resp = await fetch(INNERTUBE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": INNERTUBE_USER_AGENT,
    },
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      videoId,
    }),
  });

  if (!resp.ok) {
    throw new Error(`InnerTube request failed (status: ${resp.status})`);
  }

  const data = await resp.json();
  const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
    throw new Error("У этого видео нет субтитров на YouTube");
  }

  // Filter STRICTLY for manual German subtitles (reject kind === 'asr', vssId starting with a., and auto-generated)
  const manualGermanTrack = captionTracks.find((track: any) => {
    const isAsr =
      track.kind === "asr" ||
      (track.vssId && track.vssId.startsWith("a.")) ||
      /auto-generated|automatisch/i.test(track.name?.runs?.[0]?.text || track.name?.simpleText || "");

    if (isAsr) return false;

    const langCode = (track.languageCode || "").toLowerCase();
    const trackName = (track.name?.runs?.[0]?.text || track.name?.simpleText || "").toLowerCase();

    return langCode.startsWith("de") || trackName.includes("deutsch") || trackName.includes("german");
  });

  if (!manualGermanTrack) {
    const hasOnlyAsr = captionTracks.some((t: any) => t.kind === "asr" || t.vssId?.startsWith("a."));
    if (hasOnlyAsr) {
      throw new Error("ASR_ONLY: Доступны только автоматические субтитры. Требуются качественные ручные субтитры.");
    }
    throw new Error("Ручные немецкие субтитры не найдены");
  }

  const subRes = await fetch(manualGermanTrack.baseUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });

  if (!subRes.ok) {
    throw new Error(`Failed to download subtitle XML (status: ${subRes.status})`);
  }

  const xmlText = await subRes.text();
  const parsed = parseTimedTextXml(xmlText);

  if (parsed.length === 0) {
    throw new Error("Пустой файл субтитров");
  }

  return parsed;
}

/**
 * 2. Fallback: Public Invidious API (Strictly manual German tracks)
 */
async function fetchViaInvidious(videoId: string): Promise<TranscriptItem[]> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${base}/api/v1/captions/${videoId}`, {
        signal: AbortSignal.timeout(4500),
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (!data.captions || !Array.isArray(data.captions) || data.captions.length === 0) {
        continue;
      }

      // Filter STRICTLY for manual German subtitle track
      const track = data.captions.find((c: any) => {
        const isAsr = c.kind === "asr" || /auto/i.test(c.label || "");
        if (isAsr) return false;
        const lang = (c.languageCode || "").toLowerCase();
        const label = (c.label || "").toLowerCase();
        return lang.startsWith("de") || label.includes("german") || label.includes("deutsch");
      });

      if (!track?.url) continue;

      const fullUrl = track.url.startsWith("http") ? track.url : `${base}${track.url}`;
      const vttRes = await fetch(fullUrl, { signal: AbortSignal.timeout(4500) });
      if (!vttRes.ok) continue;

      const vttText = await vttRes.text();
      const parsedItems = parseVttOrSrtToTranscript(vttText);

      if (parsedItems.length > 0) {
        return parsedItems;
      }
    } catch {}
  }

  throw new Error("Invidious fallback did not find manual German captions");
}

/**
 * 3. Fallback: Public Piped API (Strictly manual German tracks)
 */
async function fetchViaPiped(videoId: string): Promise<TranscriptItem[]> {
  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${base}/streams/${videoId}`, {
        signal: AbortSignal.timeout(4500),
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const subs = data.subtitles;
      if (!subs || !Array.isArray(subs) || subs.length === 0) continue;

      const track = subs.find((s: any) => {
        if (s.autoGenerated) return false;
        if (/auto/i.test(s.name || "")) return false;
        const code = (s.code || "").toLowerCase();
        const name = (s.name || "").toLowerCase();
        return code.startsWith("de") || name.includes("german") || name.includes("deutsch");
      });

      if (!track?.url) continue;

      const subRes = await fetch(track.url, { signal: AbortSignal.timeout(4500) });
      if (!subRes.ok) continue;

      const subText = await subRes.text();
      const parsedItems = parseVttOrSrtToTranscript(subText);

      if (parsedItems.length > 0) {
        return parsedItems;
      }
    } catch {}
  }

  throw new Error("Piped fallback did not find manual German captions");
}

/**
 * Main transcript orchestrator (STRICTLY MANUAL GERMAN SUBTITLES)
 */
async function getTranscript(videoId: string): Promise<TranscriptItem[]> {
  // Step 1: InnerTube API
  try {
    return await fetchViaInnerTube(videoId);
  } catch (err: any) {
    if (err?.message?.startsWith("ASR_ONLY")) {
      throw err;
    }
  }

  // Step 2: Fallback to Invidious
  try {
    return await fetchViaInvidious(videoId);
  } catch {}

  // Step 3: Fallback to Piped
  try {
    return await fetchViaPiped(videoId);
  } catch {}

  throw new Error("У этого видео нет доступных ручных немецких субтитров (автосабы ASR исключены).");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId")?.trim();

    if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
      return NextResponse.json(
        {
          error: "Некорректный идентификатор YouTube видео (должен состоять ровно из 11 символов).",
          details: "Invalid videoId parameter",
        },
        { status: 400 }
      );
    }

    const transcript = await getTranscript(videoId);

    return NextResponse.json(
      { transcript },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error: any) {
    const message = error?.message || "Неизвестная ошибка";
    const isAsrOnly = message.includes("ASR_ONLY") || message.includes("автоматические субтитры") || message.includes("ручных");

    return NextResponse.json(
      {
        error: isAsrOnly
          ? "У этого видео доступны только автоматические субтитры (ASR). Раздел поддерживает только ролики с проверенными ручными субтитрами."
          : "Субтитры недоступны для данного видео.",
        details: message,
      },
      { status: 404 }
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
          error: "Некорректный идентификатор YouTube видео (должен состоять ровно из 11 символов).",
          details: "Invalid videoId parameter",
        },
        { status: 400 }
      );
    }

    const transcript = await getTranscript(videoId);
    return NextResponse.json({ transcript });
  } catch (error: any) {
    const message = error?.message || "Неизвестная ошибка";
    const isAsrOnly = message.includes("ASR_ONLY") || message.includes("автоматические субтитры") || message.includes("ручных");

    return NextResponse.json(
      {
        error: isAsrOnly
          ? "У этого видео доступны только автоматические субтитры (ASR). Требуются качественные ручные субтитры."
          : "Не удалось получить субтитры.",
        details: message,
      },
      { status: 404 }
    );
  }
}
