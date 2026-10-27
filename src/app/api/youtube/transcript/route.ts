import { NextRequest, NextResponse } from "next/server";
import { TranscriptItem } from "@/types/youtube";

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const INNERTUBE_CLIENT_VERSION = "20.10.38";
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yt.chocolatemoo53.com",
  "https://invidious.einfachzocken.eu",
  "https://yewtu.be",
  "https://invidious.drgns.space",
];

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
  "https://pipedapi.leptons.xyz",
  "https://piped-api.garudalinux.org",
  "https://pa.il.ax",
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
    if (items.length > 0) return items;
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
 * Selection logic for German subtitle track:
 * 1. Priority 1: German manual ('de', no ASR)
 * 2. Priority 2: German automatic ('de', kind: 'asr', a.de)
 * 3. Priority 3: Any German dialect/regional track (de-DE, de-AT, de-CH)
 */
function selectBestGermanTrack(tracks: any[]): any {
  if (!Array.isArray(tracks) || tracks.length === 0) return null;

  const isGerman = (t: any) => {
    const lang = (t.languageCode || t.code || "").toLowerCase();
    const vss = (t.vssId || "").toLowerCase();
    const name = (t.name?.runs?.[0]?.text || t.name?.simpleText || t.name || t.label || "").toLowerCase();
    return lang.startsWith("de") || vss.includes(".de") || name.includes("deutsch") || name.includes("german");
  };

  const isAsr = (t: any) => {
    const vss = (t.vssId || "").toLowerCase();
    const name = (t.name?.runs?.[0]?.text || t.name?.simpleText || t.name || t.label || "").toLowerCase();
    return t.kind === "asr" || t.autoGenerated === true || vss.startsWith("a.") || /auto-generated|automatisch/i.test(name);
  };

  const germanTracks = tracks.filter(isGerman);
  if (germanTracks.length === 0) return null;

  // 1. Priority 1: German manual ('de', no ASR)
  const p1 = germanTracks.find((t) => !isAsr(t) && ((t.languageCode || t.code) === "de" || t.vssId === ".de"));
  if (p1) return p1;

  // 2. Priority 2: German automatic ('de', kind: 'asr', a.de)
  const p2 = germanTracks.find((t) => isAsr(t) && ((t.languageCode || t.code) === "de" || (t.vssId && t.vssId.includes(".de"))));
  if (p2) return p2;

  // 3. Priority 3: Any German manual dialect track (de-DE, de-AT, de-CH)
  const p3 = germanTracks.find((t) => !isAsr(t));
  if (p3) return p3;

  // 4. Any remaining German track (e.g. regional auto)
  return germanTracks[0];
}

/**
 * 1. Primary Method: InnerTube API (Android Client)
 */
async function fetchViaInnerTube(videoId: string): Promise<TranscriptItem[]> {
  const resp = await fetch(INNERTUBE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": INNERTUBE_USER_AGENT,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: INNERTUBE_CLIENT_VERSION,
        },
      },
      videoId,
    }),
  });

  if (!resp.ok) {
    throw new Error(`InnerTube request failed (status: ${resp.status})`);
  }

  const data = await resp.json();
  const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
    throw new Error("У этого видео нет субтитров");
  }

  const selectedTrack = selectBestGermanTrack(captionTracks);
  if (!selectedTrack || !selectedTrack.baseUrl) {
    throw new Error("Немецкие субтитры не найдены");
  }

  const subRes = await fetch(selectedTrack.baseUrl, {
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
 * 2. Fallback: Public Invidious API
 */
async function fetchViaInvidious(videoId: string): Promise<TranscriptItem[]> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${base}/api/v1/captions/${videoId}`, {
        signal: AbortSignal.timeout(3500),
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (!data.captions || !Array.isArray(data.captions) || data.captions.length === 0) {
        continue;
      }

      const track = selectBestGermanTrack(data.captions);
      if (!track?.url) continue;

      const fullUrl = track.url.startsWith("http") ? track.url : `${base}${track.url}`;
      const vttRes = await fetch(fullUrl, { signal: AbortSignal.timeout(3500) });
      if (!vttRes.ok) continue;

      const vttText = await vttRes.text();
      const parsedItems = parseVttOrSrtToTranscript(vttText);

      if (parsedItems.length > 0) {
        return parsedItems;
      }
    } catch {}
  }

  throw new Error("Invidious fallback did not find German captions");
}

/**
 * 3. Fallback: Public Piped API
 */
async function fetchViaPiped(videoId: string): Promise<TranscriptItem[]> {
  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${base}/streams/${videoId}`, {
        signal: AbortSignal.timeout(3500),
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const subs = data.subtitles;
      if (!subs || !Array.isArray(subs) || subs.length === 0) continue;

      const track = selectBestGermanTrack(subs);
      if (!track?.url) continue;

      const subRes = await fetch(track.url, { signal: AbortSignal.timeout(3500) });
      if (!subRes.ok) continue;

      const subText = await subRes.text();
      const parsedItems = parseVttOrSrtToTranscript(subText);

      if (parsedItems.length > 0) {
        return parsedItems;
      }
    } catch {}
  }

  throw new Error("Piped fallback did not find German captions");
}

/**
 * Main transcript orchestrator
 */
async function getTranscript(videoId: string): Promise<TranscriptItem[]> {
  // Step 1: InnerTube API (Direct)
  try {
    return await fetchViaInnerTube(videoId);
  } catch {}

  // Step 2: Fallback to Invidious
  try {
    return await fetchViaInvidious(videoId);
  } catch {}

  // Step 3: Fallback to Piped
  try {
    return await fetchViaPiped(videoId);
  } catch {}

  throw new Error("Субтитры недоступны для этого видео.");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId")?.trim();

    if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
      return NextResponse.json(
        {
          error: "Некорректный идентификатор YouTube видео.",
          transcript: [],
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
    return NextResponse.json(
      {
        error: "Субтитры недоступны для этого видео",
        transcript: [],
        details: error?.message,
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
          error: "Некорректный идентификатор YouTube видео.",
          transcript: [],
        },
        { status: 400 }
      );
    }

    const transcript = await getTranscript(videoId);
    return NextResponse.json({ transcript });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Субтитры недоступны для этого видео",
        transcript: [],
        details: error?.message,
      },
      { status: 404 }
    );
  }
}
