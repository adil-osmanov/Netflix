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

async function fetchLLMTranslation(
  word: string,
  sentence: string
): Promise<TranslationResult | null> {
  const prompt = `Ты context-aware переводчик с немецкого на русский.
Определи значение слова "${word}" строго в контексте предложения: "${sentence}".
Учитывай часть речи: если слово написано со строчной буквы в середине фразы ("mache"), это форма глагола (machen = делать), а не редкое существительное.
Верни строго JSON:
{
  "translation": "точный перевод на русский в данном контексте (1-2 слова)",
  "lemma": "начальная форма слова (инфинитив глагола или существительное с артиклем со строчной буквы: der/die/das)",
  "pos": "verb" | "noun" | "adj" | "adv" | "other"
}`;

  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        const content = JSON.parse(data.choices?.[0]?.message?.content || "{}");
        if (content.translation) {
          const artMatch = content.lemma?.match(/^(der|die|das)\s+/i);
          return {
            lemma: content.lemma || word,
            article: (artMatch ? artMatch[1].toLowerCase() : null) as any,
            cleanWord: word,
            wordClean: word,
            pos: content.pos || "other",
            translation: content.translation.toLowerCase().trim(),
          };
        }
      }
    } catch {}
  }
  return null;
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
  const isLowercase = /^[a-zäöüß]/.test(cleanWord);

  // Common verb inflection overrides (e.g. mache -> machen)
  const commonVerbs: Record<string, string> = {
    mache: "machen",
    machst: "machen",
    macht: "machen",
    machte: "machen",
    gemacht: "machen",
    gehe: "gehen",
    gehst: "gehen",
    geht: "gehen",
    ging: "gehen",
    gegangen: "gehen",
    sehe: "sehen",
    siehst: "sehen",
    sieht: "sehen",
    sah: "sehen",
    gesehen: "sehen",
    habe: "haben",
    hast: "haben",
    hat: "haben",
    hatte: "haben",
    gehabt: "haben",
    bin: "sein",
    bist: "sein",
    ist: "sein",
    sind: "sein",
    war: "sein",
    gewesen: "sein",
  };

  const lowerWord = cleanWord.toLowerCase();
  if (isLowercase && commonVerbs[lowerWord]) {
    return {
      lemma: commonVerbs[lowerWord],
      article: null,
      wordClean: lowerWord,
      pos: "verb",
    };
  }

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

      // If word is lowercase in sentence, prioritize verb form over rare homonym nouns (e.g. die Mache)
      if (isLowercase && (extract.includes("Verb") || extract.includes("Konjugierte Form"))) {
        detectedPos = "verb";
        const verbMatch = extract.match(
          /(?:Form|Präteritum|Partizip II)\s+(?:des Verbs|von)\s+([a-zäöüß]+)/
        );
        if (verbMatch && verbMatch[1]) {
          baseLemma = verbMatch[1].toLowerCase();
        }
      } else if (
        !isLowercase &&
        (extract.includes("Substantiv, m") || extract.includes("männliches Substantiv"))
      ) {
        detectedPos = "noun";
        detectedArticle = "der";
      } else if (
        !isLowercase &&
        (extract.includes("Substantiv, f") || extract.includes("weibliches Substantiv"))
      ) {
        detectedPos = "noun";
        detectedArticle = "die";
      } else if (
        !isLowercase &&
        (extract.includes("Substantiv, n") || extract.includes("sächliches Substantiv"))
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
      detectedArticle = "das";
      detectedPos = "noun";
    }
  }

  if (isLowercase && detectedPos === "other") {
    if (cleanWord.endsWith("en") || cleanWord.endsWith("ern") || cleanWord.endsWith("eln") || cleanWord.endsWith("e") || cleanWord.endsWith("t")) {
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

async function fetchGoogleTranslation(word: string, isVerb: boolean): Promise<string> {
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

      // If word is a verb, prioritize verb definition in dictionary terms to prevent false nouns (e.g. mache -> обман)
      if (gData[1] && Array.isArray(gData[1]) && gData[1].length > 0) {
        if (isVerb) {
          const verbEntry = gData[1].find((item: any) => item[0] === "verb");
          if (verbEntry && Array.isArray(verbEntry[1]) && verbEntry[1].length > 0) {
            return verbEntry[1][0].toLowerCase().trim();
          }
        }

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

  // 1. Try LLM translation with full sentence context first
  const llmResult = await fetchLLMTranslation(clean, sentence);
  if (llmResult) {
    return llmResult;
  }

  // 2. Fallback to contextual morphology + Google Translate
  const isLowercaseInSentence = /^[a-zäöüß]/.test(clean);
  const morph = await analyzeGermanMorphology(clean, sentence);
  const isVerb = morph.pos === "verb" || (isLowercaseInSentence && morph.pos !== "noun");

  const translationRaw = await fetchGoogleTranslation(clean, isVerb);
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
