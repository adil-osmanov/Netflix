import { TranscriptItem } from "@/types/youtube";

const END_PUNCTUATION_REGEX = /[.!?…]["'»”]?$/;

/**
 * Merges fragmented raw YouTube subtitle snippets into complete, coherent sentences.
 * Boundary criteria:
 * 1. Punctuation mark terminating a thought (., !, ?).
 * 2. Pause between utterances exceeding 1.2 seconds.
 * 3. Text exceeds comfortable reading length (~100 chars) with a natural pause.
 */
export function mergeTranscriptSentences(rawItems: TranscriptItem[]): TranscriptItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  const merged: TranscriptItem[] = [];

  let curStart = rawItems[0].start;
  let curEnd = rawItems[0].start + rawItems[0].duration;
  let textParts: string[] = [rawItems[0].text];

  for (let i = 1; i < rawItems.length; i++) {
    const item = rawItems[i];
    const prevText = textParts.join(" ").replace(/\s+/g, " ").trim();
    const gap = item.start - curEnd;

    const hasPunctuationEnd = END_PUNCTUATION_REGEX.test(prevText);
    const hasLongPause = gap > 1.2;
    const isTooLong = prevText.length > 105 && (gap > 0.4 || /[,;:]$/.test(prevText));

    if (hasPunctuationEnd || hasLongPause || isTooLong) {
      if (prevText) {
        merged.push({
          text: prevText,
          start: Number(curStart.toFixed(2)),
          duration: Number(Math.max(0.6, curEnd - curStart).toFixed(2)),
        });
      }
      curStart = item.start;
      curEnd = item.start + item.duration;
      textParts = [item.text];
    } else {
      curEnd = Math.max(curEnd, item.start + item.duration);
      textParts.push(item.text);
    }
  }

  if (textParts.length > 0) {
    const finalText = textParts.join(" ").replace(/\s+/g, " ").trim();
    if (finalText) {
      merged.push({
        text: finalText,
        start: Number(curStart.toFixed(2)),
        duration: Number(Math.max(0.6, curEnd - curStart).toFixed(2)),
      });
    }
  }

  return merged;
}

/**
 * Strips punctuation around words for clean dictionary lookup
 */
export function cleanGermanWord(raw: string): string {
  if (!raw) return "";
  return raw.replace(/^[\s.,/#!$%"?^&*;:{}=\-_`~()«»„“”'’–—]+|[\s.,/#!$%"?^&*;:{}=\-_`~()«»„“”'’–—]+$/g, "").trim();
}
