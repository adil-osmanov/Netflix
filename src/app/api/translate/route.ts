import { NextRequest, NextResponse } from "next/server";

// Fallback morphological noun rules for German articles
function getArticleBySuffix(word: string): string | null {
  const w = word.toLowerCase();
  // Feminine suffixes
  if (w.endsWith("ung") || w.endsWith("heit") || w.endsWith("keit") || w.endsWith("schaft") || w.endsWith("ion") || w.endsWith("tät") || w.endsWith("ik") || w.endsWith("ur")) {
    return "die";
  }
  // Neuter suffixes
  if (w.endsWith("chen") || w.endsWith("lein") || w.endsWith("ment") || w.endsWith("um") || w.endsWith("tum") || w.endsWith("nis")) {
    return "das";
  }
  // Masculine suffixes
  if (w.endsWith("ismus") || w.endsWith("ling") || w.endsWith("or") || w.endsWith("ist") || w.endsWith("ant") || w.endsWith("ent")) {
    return "der";
  }
  return null;
}

async function getWiktionaryLemma(word: string): Promise<string> {
  const clean = word.replace(/^[«"'\s]+|[»"'\s.,!?;:]+$/g, "");
  if (!clean) return word;

  try {
    const wUrl = `https://de.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext&titles=${encodeURIComponent(clean)}&format=json`;
    const res = await fetch(wUrl, { next: { revalidate: 86400 } });
    if (!res.ok) return clean;

    const data = await res.json();
    const page: any = Object.values(data?.query?.pages || {})[0];
    const extract: string = page?.extract || "";

    // Noun gender
    if (extract.includes("Substantiv, m") || extract.includes("männliches Substantiv")) {
      return `der ${clean.charAt(0).toUpperCase() + clean.slice(1)}`;
    }
    if (extract.includes("Substantiv, f") || extract.includes("weibliches Substantiv")) {
      return `die ${clean.charAt(0).toUpperCase() + clean.slice(1)}`;
    }
    if (extract.includes("Substantiv, n") || extract.includes("sächliches Substantiv")) {
      return `das ${clean.charAt(0).toUpperCase() + clean.slice(1)}`;
    }

    // Plural detection
    const pluralMatch = extract.match(/Plural (?:des Substantivs|von)\s+([A-Za-zäöüÄÖÜß]+)/);
    if (pluralMatch && pluralMatch[1]) {
      const baseWord = pluralMatch[1];
      const article = getArticleBySuffix(baseWord) || "das";
      return `die (Pl.) / ${article} ${baseWord}`;
    }

    // Verb infinitive detection
    const verbMatch = extract.match(/(?:Form|Präteritum|Partizip II)\s+(?:des Verbs|von)\s+([a-zäöüß]+)/);
    if (verbMatch && verbMatch[1]) {
      return verbMatch[1];
    }
  } catch (err) {
    console.warn("Wiktionary lookup error:", err);
  }

  // Fallback noun article based on suffix if capitalized
  if (/^[A-ZÄÖÜ]/.test(clean)) {
    const suffixArticle = getArticleBySuffix(clean);
    if (suffixArticle) {
      return `${suffixArticle} ${clean}`;
    }
  }

  return clean;
}

async function getContextualTranslation(word: string, sentence?: string): Promise<{ lemma: string; translation: string }> {
  const cleanWord = word.replace(/^[«"'\s]+|[»"'\s.,!?;:]+$/g, "");

  // 1. Fetch lemma (with der/die/das or infinitive)
  const lemmaPromise = getWiktionaryLemma(cleanWord);

  // 2. Fetch word translation and dictionary options
  const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=ru&dt=t&dt=bd&q=${encodeURIComponent(cleanWord)}`;
  const gRespPromise = fetch(gUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 86400 },
  });

  const [lemma, gResp] = await Promise.all([lemmaPromise, gRespPromise]);

  let translation = cleanWord;

  if (gResp.ok) {
    const gData = await gResp.json();
    const direct = gData[0]?.[0]?.[0];
    if (direct) {
      translation = direct.trim().toLowerCase();
    }

    // If pos dictionary is present, check terms
    if (gData[1] && Array.isArray(gData[1]) && gData[1].length > 0) {
      const primaryTerms = gData[1][0]?.[1];
      if (Array.isArray(primaryTerms) && primaryTerms.length > 0) {
        translation = primaryTerms[0].toLowerCase();
      }
    }
  }

  return {
    lemma,
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
      lemma: result.lemma,
      translation: result.translation,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Ошибка сервера перевода", details: error?.message }, { status: 500 });
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
      lemma: result.lemma,
      translation: result.translation,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Ошибка перевода" }, { status: 500 });
  }
}
