import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text')?.trim();
    const from = searchParams.get('from') || 'de';
    const to = searchParams.get('to') || 'ru';

    if (!text) {
      return NextResponse.json({ error: 'Параметр text обязателен' }, { status: 400 });
    }

    // 1. Google Translate API (fast, free endpoint)
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
      const gResp = await fetch(gUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        next: { revalidate: 86400 }, // Cache translation for 24h
      });

      if (gResp.ok) {
        const gData = await gResp.json();
        if (Array.isArray(gData) && Array.isArray(gData[0])) {
          const translation = gData[0].map((item: any) => item[0]).join('').trim();
          if (translation) {
            return NextResponse.json({
              original: text,
              translation,
              from,
              to,
              provider: 'google',
            });
          }
        }
      }
    } catch (gErr) {
      console.warn('Google translation fallback triggered:', gErr);
    }

    // 2. Secondary fallback: MyMemory Translation API
    try {
      const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
      const mResp = await fetch(mUrl);
      if (mResp.ok) {
        const mData = await mResp.json();
        const translation = mData?.responseData?.translatedText;
        if (translation) {
          return NextResponse.json({
            original: text,
            translation,
            from,
            to,
            provider: 'mymemory',
          });
        }
      }
    } catch (mErr) {
      console.warn('MyMemory translation fallback failed:', mErr);
    }

    return NextResponse.json(
      { error: 'Не удалось перевести слово. Попробуйте еще раз позже.' },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Ошибка сервера перевода', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = body.text?.trim();
    const from = body.from || 'de';
    const to = body.to || 'ru';

    if (!text) {
      return NextResponse.json({ error: 'Параметр text обязателен' }, { status: 400 });
    }

    const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const gResp = await fetch(gUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    });

    if (gResp.ok) {
      const gData = await gResp.json();
      if (Array.isArray(gData) && Array.isArray(gData[0])) {
        const translation = gData[0].map((item: any) => item[0]).join('').trim();
        return NextResponse.json({ original: text, translation, from, to });
      }
    }

    return NextResponse.json({ error: 'Не удалось перевести' }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
