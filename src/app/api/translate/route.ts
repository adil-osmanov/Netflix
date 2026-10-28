import { NextRequest, NextResponse } from "next/server";

export interface TranslationResult {
  lemma: string;
  article: "der" | "die" | "das" | null;
  cleanWord: string;
  wordClean: string;
  pos: "noun" | "verb" | "adj" | "adv" | "other";
  translation: string;
}

// Morphological noun rules for German articles
function getArticleBySuffix(word: string): "der" | "die" | "das" | null {
  const w = word.toLowerCase();
  // Feminine suffixes
  if (
    w.endsWith("ung") ||
    w.endsWith("heit") ||
    w.endsWith("keit") ||
    w.endsWith("schaft") ||
    w.endsWith("ion") ||
    w.endsWith("tät") ||
    w.endsWith("ik") ||
    w.endsWith("ur") ||
    w.endsWith("ei") ||
    w.endsWith("in")
  ) {
    return "die";
  }
  // Neuter suffixes
  if (
    w.endsWith("chen") ||
    w.endsWith("lein") ||
    w.endsWith("ment") ||
    w.endsWith("um") ||
    w.endsWith("tum") ||
    w.endsWith("nis")
  ) {
    return "das";
  }
  // Masculine suffixes
  if (
    w.endsWith("ismus") ||
    w.endsWith("ling") ||
    w.endsWith("or") ||
    w.endsWith("ist") ||
    w.endsWith("ant") ||
    w.endsWith("ent") ||
    w.endsWith("er")
  ) {
    return "der";
  }
  return null;
}

// Strict casing helper: ensures no ALL-CAPS
function normalizeCasing(
  rawWord: string,
  pos: "noun" | "verb" | "adj" | "adv" | "other",
  article: "der" | "die" | "das" | null
): { wordClean: string; lemma: string; article: "der" | "die" | "das" | null } {
  let clean = rawWord.replace(/^[«"'\s()]+|[»"'\s.,!?;:()]+$/g, "");

  if (pos === "noun" || article) {
    // Nouns must be Capitalized (First letter uppercase, rest lowercase)
    const capitalized =
      clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    const art = article || "das";
    return {
      wordClean: capitalized,
      lemma: `${art} ${capitalized}`,
      article: art,
    };
  }

  // Verbs, Adjectives, Adverbs, Other: strictly lowercase
  const lower = clean.toLowerCase();
  return {
    wordClean: lower,
    lemma: lower,
    article: null,
  };
}

async function analyzeGermanMorphology(
  cleanWord: string,
  sentence: string
): Promise<{
  lemma: string;
  article: "der" | "die" | "das" | null;
  wordClean: string;
  pos: "noun" | "verb" | "adj" | "adv" | "other";
}> {
  let detectedArticle: "der" | "die" | "das" | null = null;
  let detectedPos: "noun" | "verb" | "adj" | "adv" | "other" = "other";
  let baseLemma = cleanWord;

  // 1. Check Wiktionary for exact POS and gender
  try {
    const wUrl = `https://de.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext&titles=${encodeURIComponent(
      cleanWord
    )}&format=json`;
    const res = await fetch(wUrl, {
      signal: AbortSignal.timeout(1500),
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = await res.json();
      const page: any = Object.values(data?.query?.pages || {})[0];
      const extract: string = page?.extract || "";

      if (
        extract.includes("Substantiv, m") ||
        extract.includes("männliches Substantiv")
      ) {
        detectedPos = "noun";
        detectedArticle = "der";
      } else if (
        extract.includes("Substantiv, f") ||
        extract.includes("weibliches Substantiv")
      ) {
        detectedPos = "noun";
        detectedArticle = "die";
      } else if (
        extract.includes("Substantiv, n") ||
        extract.includes("sächliches Substantiv")
      ) {
        detectedPos = "noun";
        detectedArticle = "das";
      } else if (extract.includes("Verb")) {
        detectedPos = "verb";
        const verbMatch = extract.match(
          /(?:Form|Präteritum|Partizip II)\s+(?:des Verbs|von)\s+([a-zäöüß]+)/
        );
        if (verbMatch && verbMatch[1]) {
          baseLemma = verbMatch[1].toLowerCase();
        }
      } else if (extract.includes("Adjektiv")) {
        detectedPos = "adj";
      } else if (extract.includes("Adverb")) {
        detectedPos = "adv";
      }
    }
  } catch {}

  // 2. Check sentence context for nearby articles / preposition contractions
  if (!detectedArticle && sentence) {
    const sLower = sentence.toLowerCase();
    const wLower = cleanWord.toLowerCase();
    // Regex matching article immediately before the word
    if (new RegExp(`\\b(der|dem|den|des|ein|einem|einen|eines)\\s+${wLower}\\b`, "i").test(sLower)) {
      detectedArticle = "der";
      detectedPos = "noun";
    } else if (new RegExp(`\\b(die|der|eine|einer)\\s+${wLower}\\b`, "i").test(sLower)) {
      detectedArticle = "die";
      detectedPos = "noun";
    } else if (new RegExp(`\\b(das|dem|des|ein|einem|eines|ins|ans|aufs|beim)\\s+${wLower}\\b`, "i").test(sLower)) {
      detectedArticle = "das";
      detectedPos = "noun";
    }
  }

  // 3. Check capitalization and suffixes if still unknown
  const isCapitalizedInRaw = /^[A-ZÄÖÜ]/.test(cleanWord);
  if (!detectedArticle && isCapitalizedInRaw) {
    const suffixArt = getArticleBySuffix(cleanWord);
    if (suffixArt) {
      detectedArticle = suffixArt;
      detectedPos = "noun";
    } else {
      // Default common German noun fallback
      detectedArticle = "das";
      detectedPos = "noun";
    }
  }

  if (!isCapitalizedInRaw && detectedPos === "other") {
    // Suffix rules for verbs/adjectives
    if (cleanWord.endsWith("en") || cleanWord.endsWith("ern") || cleanWord.endsWith("eln")) {
      detectedPos = "verb";
    } else if (cleanWord.endsWith("ig") || cleanWord.endsWith("lich") || cleanWord.endsWith("isch") || cleanWord.endsWith("bar")) {
      detectedPos = "adj";
    }
  }

  return {
    ...normalizeCasing(baseLemma, detectedPos, detectedArticle),
    pos: detectedPos,
  };
}

async function fetchGoogleTranslation(word: string): Promise<string> {
  const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=ru&dt=t&dt=bd&q=${encodeURIComponent(
    word
  )}`;
  try {
    const gResp = await fetch(gUrl, {
      signal: AbortSignal.timeout(2000),
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 86400 },
    });
    if (gResp.ok) {
      const gData = await gResp.json();
      // Primary dictionary term if available
      if (gData[1] && Array.isArray(gData[1]) && gData[1].length > 0) {
        const primaryTerms = gData[1][0]?.[1];
        if (Array.isArray(primaryTerms) && primaryTerms.length > 0) {
          return primaryTerms[0].toLowerCase().trim();
        }
      }
      const direct = gData[0]?.[0]?.[0];
      if (direct) {
        return direct.trim().toLowerCase();
      }
    }
  } catch {}
  return word.toLowerCase();
}

export async function getContextualTranslation(
  word: string,
  sentence: string = ""
): Promise<TranslationResult> {
  const clean = word.replace(/^[«"'\s()]+|[»"'\s.,!?;:()]+$/g, "");
  if (!clean) {
    return {
      lemma: word,
      article: null,
      cleanWord: word,
      wordClean: word,
      pos: "other",
      translation: "",
    };
  }

  // Run morphology detection and translation concurrently
  const [morph, translationRaw] = await Promise.all([
    analyzeGermanMorphology(clean, sentence),
    fetchGoogleTranslation(clean),
  ]);

  // Clean translation of any excessive punctuation or capitalization
  const translation = translationRaw.toLowerCase().replace(/^[«"'\s]+|[»"'\s]+$/g, "");

  return {
    lemma: morph.lemma,
    article: morph.article,
    cleanWord: morph.wordClean,
    wordClean: morph.wordClean,
    pos: morph.pos,
    translation,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get("word") || searchParams.get("text") || "";
    const sentence = searchParams.get("sentence") || "";

    if (!word) {
      return NextResponse.json({ error: "Параметр word обязателен" }, { status: 400 });
    }

    const result = await getContextualTranslation(word, sentence);

    return NextResponse.json({
      word,
      sentence,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Ошибка сервера перевода", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const word = body.word || body.text || "";
    const sentence = body.sentence || "";

    if (!word) {
      return NextResponse.json({ error: "Параметр word обязателен" }, { status: 400 });
    }

    const result = await getContextualTranslation(word, sentence);

    return NextResponse.json({
      word,
      sentence,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Ошибка перевода" },
      { status: 500 }
    );
  }
}
