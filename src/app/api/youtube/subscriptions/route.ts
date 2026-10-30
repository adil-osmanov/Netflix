import { NextRequest, NextResponse } from "next/server";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import { fetchChannelVideosPage } from "@/utils/youtubeChannelParser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function handleSubscriptionsFeed({
  channelIds,
  page = 1,
  limit = 24,
  excludeSet,
  continuationTokens = {},
  singleChannelMode = false,
}: {
  channelIds: string[];
  page: number;
  limit: number;
  excludeSet: Set<string>;
  continuationTokens: Record<string, string | null>;
  singleChannelMode: boolean;
}) {
  if (channelIds.length === 0) {
    return NextResponse.json(
      {
        page,
        limit,
        videos: [],
        items: [],
        continuationTokens: {},
        hasMore: false,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }

  const normalizedChannelIds = Array.from(
    new Set(
      channelIds.map((id) =>
        id === "UCBxb2fqPB4w05QKumFO7Smw" ? "UCbxb2fqe9oNgglAoYqsYOtQ" : id
      )
    )
  );

  const allVideos: YouTubeRecommendedVideo[] = [];
  const nextContinuationTokens: Record<string, string | null> = { ...continuationTokens };

  await Promise.all(
    normalizedChannelIds.map(async (channelId) => {
      try {
        const token = continuationTokens[channelId] || null;
        const { videos, nextContinuation } = await fetchChannelVideosPage(
          channelId,
          token,
          ""
        );
        nextContinuationTokens[channelId] = nextContinuation;

        for (const v of videos) {
          allVideos.push(v);
        }
      } catch {}
    })
  );

  const seen = new Set<string>();
  const deduplicated: YouTubeRecommendedVideo[] = [];
  for (const v of allVideos) {
    const vid = (v as any).youtube_id || v.id;
    if (!seen.has(vid) && !excludeSet.has(vid)) {
      seen.add(vid);
      deduplicated.push({
        ...v,
        id: vid,
      });
    }
  }

  // Для одного выбранного канала отдаем все свежие ролики подряд (30–60 штук за раз),
  // а для общей ленты всех подписок перемешиваем и отдаем крупную пачку
  const orderedVideos = singleChannelMode ? deduplicated : shuffleArray(deduplicated);
  const pageVideos = singleChannelMode ? orderedVideos : orderedVideos.slice(0, limit);

  const anyChannelHasContinuation = Object.values(nextContinuationTokens).some((t) => Boolean(t));
  const hasRemainingInBatch = !singleChannelMode && orderedVideos.length > pageVideos.length;

  return NextResponse.json(
    {
      page,
      limit,
      videos: pageVideos,
      items: pageVideos,
      continuationTokens: nextContinuationTokens,
      hasMore: anyChannelHasContinuation || hasRemainingInBatch || pageVideos.length > 0,
      totalAvailable: orderedVideos.length,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelIdsParam =
      searchParams.get("channelIds") || searchParams.get("channels") || "";
    const channelIds = channelIdsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(60, parseInt(searchParams.get("limit") || "24", 10)));
    const excludeParam = searchParams.get("exclude") || "";
    const excludeSet = new Set(
      excludeParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );

    return await handleSubscriptionsFeed({
      channelIds,
      page,
      limit,
      excludeSet,
      continuationTokens: {},
      singleChannelMode: channelIds.length === 1,
    });
  } catch (error: any) {
    console.error("API [subscriptions GET] error:", error?.message);
    return NextResponse.json(
      { error: "Ошибка при получении видео подписок", videos: [], items: [], hasMore: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawChannels = body.channelIds || body.channels || [];
    const channelIds: string[] = Array.isArray(rawChannels)
      ? rawChannels
      : typeof rawChannels === "string"
      ? rawChannels.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const page = Math.max(1, Number(body.page) || 1);
    const limit = Math.max(1, Math.min(60, Number(body.limit) || 24));
    const rawExclude = body.excludeIds || body.exclude || [];
    const excludeList: string[] = Array.isArray(rawExclude)
      ? rawExclude
      : typeof rawExclude === "string"
      ? rawExclude.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const excludeSet = new Set(excludeList);
    const continuationTokens = body.continuationTokens || {};
    const singleChannelMode = Boolean(body.singleChannelMode) || channelIds.length === 1;

    return await handleSubscriptionsFeed({
      channelIds,
      page,
      limit,
      excludeSet,
      continuationTokens,
      singleChannelMode,
    });
  } catch (error: any) {
    console.error("API [subscriptions POST] error:", error?.message);
    return NextResponse.json(
      { error: "Ошибка при получении видео подписок", videos: [], items: [], hasMore: false },
      { status: 500 }
    );
  }
}
