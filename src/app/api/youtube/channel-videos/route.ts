import { NextResponse } from "next/server";
import { fetchChannelVideosPage } from "@/utils/youtubeChannelParser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { channelId, continuationToken, channelName, excludeIds = [] } = body;

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    const excludeSet = new Set<string>(Array.isArray(excludeIds) ? excludeIds : []);

    const { videos, nextContinuation, channelTitle } = await fetchChannelVideosPage(
      channelId,
      continuationToken,
      channelName || ""
    );

    const filteredVideos = videos.filter(
      (v) => !excludeSet.has(v.id) && !excludeSet.has(v.youtube_id)
    );

    return NextResponse.json(
      {
        items: filteredVideos,
        videos: filteredVideos,
        channelTitle,
        continuationToken: nextContinuation,
        hasMore: Boolean(nextContinuation) || filteredVideos.length > 0,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Channel videos parse error:", error);
    return NextResponse.json({ items: [], videos: [], hasMore: false }, { status: 500 });
  }
}
