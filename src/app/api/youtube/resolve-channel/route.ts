import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { input } = await req.json();
        if (!input || typeof input !== "string") {
            return NextResponse.json({ error: "Empty input" }, { status: 400 });
        }

        const trimmed = input.trim();

        // 1. Direct 24-char UC channel ID
        if (/^UC[\w-]{22}$/.test(trimmed)) {
            return NextResponse.json({ channelId: trimmed });
        }

        // 2. Standard /channel/UC... URL
        const channelMatch = trimmed.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
        if (channelMatch) {
            return NextResponse.json({ channelId: channelMatch[1] });
        }

        // 3. Extract @handle from URL or raw string (e.g., https://www.youtube.com/@CHECKERWELT or @CHECKERWELT)
        const handleMatch = trimmed.match(/(?:youtube\.com\/)?@([\w.-]+)/);
        const handle = handleMatch
            ? handleMatch[1]
            : trimmed.replace(/^https?:\/\/(www\.)?youtube\.com\/(c\/|user\/)?/, "").replace(/^@/, "").split(/[/?#]/)[0];

        if (!handle) {
            return NextResponse.json({ error: "Invalid handle or URL" }, { status: 400 });
        }

        // 4. Fetch YouTube channel page and extract real UC... channelId
        const url = `https://www.youtube.com/@${encodeURIComponent(handle)}`;
        const res = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
                Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+417",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            return NextResponse.json({ error: "Канал не найден на YouTube" }, { status: 404 });
        }

        const html = await res.text();

        // Match externalId, itemprop="channelId", or RSS channel_id in page source
        const idMatch =
            html.match(/"externalId":"(UC[\w-]{22})"/) ||
            html.match(/itemprop="channelId"\s+content="(UC[\w-]{22})"/) ||
            html.match(/channel_id=(UC[\w-]{22})/);

        if (!idMatch?.[1]) {
            return NextResponse.json(
                { error: "Не удалось извлечь ID канала из страницы" },
                { status: 404 }
            );
        }

        // Also extract clean channel title if available
        const titleMatch =
            html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
            html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i);
        const channelTitle = titleMatch?.[1]?.trim() || `@${handle}`;

        return NextResponse.json({
            channelId: idMatch[1],
            channelTitle,
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Resolve error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
