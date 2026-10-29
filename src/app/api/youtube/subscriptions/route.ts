import { NextRequest, NextResponse } from "next/server";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import { isValidDuration } from "../recommendations/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelIdsParam = searchParams.get("channelIds") || searchParams.get("channels") || "";
    const rawChannelIds = channelIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
    const channelIds = Array.from(
      new Set(
        rawChannelIds.map((id) =>
          id === "UCBxb2fqPB4w05QKumFO7Smw" ? "UCbxb2fqe9oNgglAoYqsYOtQ" : id
        )
      )
    );
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "16", 10)));
    const excludeParam = searchParams.get("exclude") || "";
    const excludeSet = new Set(excludeParam.split(",").map((s) => s.trim()).filter(Boolean));

    if (channelIds.length === 0) {
      return NextResponse.json(
        {
          page,
          limit,
          videos: [],
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

    const allVideos: YouTubeRecommendedVideo[] = [];

    await Promise.all(
      channelIds.map(async (channelId) => {
        try {
          const resp = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            body: JSON.stringify({
              context: {
                client: {
                  clientName: "WEB",
                  clientVersion: "2.20240101.01.00",
                  hl: "de",
                  gl: "DE",
                },
              },
              browseId: channelId,
              params: "EgZ2aWRlb3PyBgQKAjoA",
            }),
            next: { revalidate: 900 },
          });

          if (!resp.ok) return;

          const data = await resp.json();
          const channelTitle =
            data?.metadata?.channelMetadataRenderer?.title ||
            data?.header?.pageHeaderRenderer?.pageTitle ||
            "Канал";
          const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs;
          const videoTab = tabs?.find((t: any) => t.tabRenderer?.selected);
          const richItems = videoTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

          for (const item of richItems) {
            const lockup = item?.richItemRenderer?.content?.lockupViewModel;
            const vr = item?.richItemRenderer?.content?.videoRenderer;

            const id = lockup?.contentId || vr?.videoId;
            if (!id || !YOUTUBE_ID_REGEX.test(id)) continue;

            const rawTitle =
              lockup?.metadata?.lockupMetadataViewModel?.title?.content ||
              vr?.title?.runs?.[0]?.text ||
              "";

            const cleanTitle = rawTitle
              .replace(/&amp;/g, "&")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">");

            let durationText = "";
            const overlays = lockup?.contentImage?.thumbnailViewModel?.overlays || [];
            for (const ov of overlays) {
              const badges = ov?.thumbnailBottomOverlayViewModel?.badges;
              if (Array.isArray(badges) && badges[0]?.thumbnailBadgeViewModel?.text) {
                durationText = badges[0].thumbnailBadgeViewModel.text.trim();
                break;
              }
            }
            if (!durationText && vr?.lengthText?.simpleText) {
              durationText = vr.lengthText.simpleText.trim();
            }

            // Строго от 10 минут (>= 600 секунд)
            if (!isValidDuration(durationText)) continue;

            const text = `${id} ${cleanTitle}`.toLowerCase();
            if (
              lockup?.contentType === "LOCKUP_CONTENT_TYPE_SHORTS" ||
              lockup?.contentType === "LOCKUP_CONTENT_TYPE_LIVE" ||
              /\b(shorts?|short|vertical|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(text) ||
              /#(shorts?|short|vertical|tiktok|reels?)/i.test(text) ||
              text.includes("🔴")
            ) {
              continue;
            }

            allVideos.push({
              id,
              title: cleanTitle,
              channel: channelTitle,
              channelId,
              level: "B1",
              thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
              description: `${channelTitle} • Последние выпуски`,
              durationText,
            });
          }
        } catch {}
      })
    );

    const seen = new Set<string>();
    const deduplicated: YouTubeRecommendedVideo[] = [];
    for (const v of allVideos) {
      if (!seen.has(v.id)) {
        seen.add(v.id);
        deduplicated.push(v);
      }
    }

    const availableVideos = shuffleArray(deduplicated.filter((v) => !excludeSet.has(v.id)));
    const offset = (page - 1) * limit;
    const pageVideos = availableVideos.slice(offset, offset + limit);

    return NextResponse.json(
      {
        page,
        limit,
        videos: pageVideos,
        hasMore: offset + limit < availableVideos.length,
        totalAvailable: availableVideos.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("API [subscriptions] error:", error?.message);
    return NextResponse.json(
      { error: "Ошибка при получении видео подписок", details: error?.message },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
