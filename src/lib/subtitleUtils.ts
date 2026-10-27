import { TranscriptItem } from "@/types/youtube";

function mergeOverlapWords(prev: string, next: string): string {
  if (!prev) return next;
  if (!next) return prev;
  if (next.toLowerCase().startsWith(prev.toLowerCase())) return next;
  if (prev.toLowerCase().endsWith(next.toLowerCase())) return prev;

  const prevWords = prev.split(/\s+/).filter(Boolean);
  const nextWords = next.split(/\s+/).filter(Boolean);

  const maxLen = Math.min(prevWords.length, nextWords.length);
  for (let len = maxLen; len > 0; len--) {
    const prevSuffix = prevWords.slice(-len).join(" ").toLowerCase();
    const nextPrefix = nextWords.slice(0, len).join(" ").toLowerCase();
    if (prevSuffix === nextPrefix) {
      return prevWords.concat(nextWords.slice(len)).join(" ");
    }
  }

  return prev + " " + next;
}

/**
 * Normalizes rolling-window YouTube auto-captions and groups them strictly into
 * 1 single sentence of maximum 10-14 words to prevent cyclic duplicates and screen overflow.
 */
export function mergeTranscriptSentences(rawItems: TranscriptItem[]): TranscriptItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  // Step 1: Remove rolling window overlap and exact sequential duplicates
  const deduplicated: TranscriptItem[] = [];
  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const text = (item.text || "").replace(/\s+/g, " ").trim();
    if (!text) continue;

    if (deduplicated.length > 0) {
      const prev = deduplicated[deduplicated.length - 1];

      // Exact duplicate
      if (prev.text.toLowerCase() === text.toLowerCase()) {
        prev.duration = Math.max(prev.duration, item.start + item.duration - prev.start);
        continue;
      }

      // Rolling window overlap
      const mergedText = mergeOverlapWords(prev.text, text);
      if (
        mergedText !== prev.text + " " + text &&
        mergedText.length <= prev.text.length + text.length
      ) {
        prev.text = mergedText;
        prev.duration = Math.max(prev.duration, item.start + item.duration - prev.start);
        continue;
      }
    }
    deduplicated.push({ text, start: item.start, duration: item.duration });
  }

  // Step 2: Strictly 1 sentence per item, max 10-13 words, splitting on punctuation or limits
  const results: TranscriptItem[] = [];
  const END_PUNCT = /[.!?…]["'»”]?$/;
  const COMMA_PUNCT = /[,;:]["'»”]?$/;

  for (let i = 0; i < deduplicated.length; i++) {
    const item = deduplicated[i];
    const words = item.text.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    let subStart = item.start;
    let currentWords: string[] = [];

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      currentWords.push(word);

      const wordCount = currentWords.length;
      const isEnd = END_PUNCT.test(word);
      const isCommaSplit = COMMA_PUNCT.test(word) && wordCount >= 7;
      const isMaxLimit = wordCount >= 11;
      const isLastWord = w === words.length - 1;

      if (isEnd || isCommaSplit || isMaxLimit || isLastWord) {
        const sentenceText = currentWords.join(" ").trim();
        const fraction = (w + 1) / words.length;
        const currentEnd = item.start + item.duration * fraction;
        const subDuration = Number(Math.max(0.6, currentEnd - subStart).toFixed(2));

        if (sentenceText) {
          results.push({
            text: sentenceText,
            start: Number(subStart.toFixed(2)),
            duration: subDuration,
          });
        }

        subStart = currentEnd;
        currentWords = [];
      }
    }
  }

  return results;
}

/**
 * Strips punctuation around words for clean dictionary lookup
 */
export function cleanGermanWord(raw: string): string {
  if (!raw) return "";
  return raw.replace(/^[\s.,/#!$%"?^&*;:{}=\-_`~()«»„“”'’–—]+|[\s.,/#!$%"?^&*;:{}=\-_`~()«»„“”'’–—]+$/g, "").trim();
}
