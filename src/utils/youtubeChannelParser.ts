const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function parseDurationSeconds(durationText: string): number {
  if (!durationText) return 0;
  const clean = durationText.trim();
  const parts = clean.split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export function extractVideosFromRichContents(
  contents: any[],
  fallbackChannelName: string,
  channelId: string
): { videos: any[]; nextContinuation: string | null } {
  const videos: any[] = [];
  let nextContinuation: string | null = null;

  for (const item of contents) {
    const v = item?.richItemRenderer?.content?.videoRenderer;
    const lockup = item?.richItemRenderer?.content?.lockupViewModel;

    if (v && v.videoId && YOUTUBE_ID_REGEX.test(v.videoId)) {
      const durationText =
        v.lengthText?.simpleText ||
        v.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)
          ?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText ||
        "00:00";

      const durationSeconds = parseDurationSeconds(durationText);
      const rawTitle = v.title?.runs?.[0]?.text || v.title?.simpleText || "";
      const channelName =
        v.ownerText?.runs?.[0]?.text ||
        v.shortBylineText?.runs?.[0]?.text ||
        fallbackChannelName;

      // Фильтр Shorts: берем только нормальные видео (от 3-4 минут, >= 200 секунд)
      if (durationSeconds >= 200 && !/#shorts?\b/i.test(rawTitle)) {
        videos.push({
          id: v.videoId,
          youtube_id: v.videoId,
          title: rawTitle,
          channel: channelName,
          channelId,
          level: durationSeconds >= 1200 ? "B2" : "B1",
          duration_str: durationText,
          durationText,
          duration_seconds: durationSeconds,
          duration: durationSeconds,
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          thumbnailUrl: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          published: v.publishedTimeText?.simpleText || "",
          description: `${channelName} • ${v.publishedTimeText?.simpleText || "Видео канала"}`,
        });
      }
    } else if (lockup && lockup.contentId && YOUTUBE_ID_REGEX.test(lockup.contentId)) {
      const videoId = lockup.contentId;
      const rawTitle = lockup.metadata?.lockupMetadataViewModel?.title?.content || "";

      let durationText = "00:00";
      const overlays = lockup.contentImage?.thumbnailViewModel?.overlays || [];
      for (const ov of overlays) {
        const badges = ov?.thumbnailBottomOverlayViewModel?.badges;
        if (Array.isArray(badges) && badges[0]?.thumbnailBadgeViewModel?.text) {
          durationText = badges[0].thumbnailBadgeViewModel.text.trim();
          break;
        }
      }

      const durationSeconds = parseDurationSeconds(durationText);
      if (
        durationSeconds >= 200 &&
        lockup.contentType !== "LOCKUP_CONTENT_TYPE_SHORTS" &&
        lockup.contentType !== "LOCKUP_CONTENT_TYPE_LIVE" &&
        !/#shorts?\b/i.test(rawTitle)
      ) {
        videos.push({
          id: videoId,
          youtube_id: videoId,
          title: rawTitle,
          channel: fallbackChannelName,
          channelId,
          level: durationSeconds >= 1200 ? "B2" : "B1",
          duration_str: durationText,
          durationText,
          duration_seconds: durationSeconds,
          duration: durationSeconds,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          published: "",
          description: `${fallbackChannelName} • Видео канала`,
        });
      }
    }

    if (item?.continuationItemRenderer) {
      const token =
        item.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ||
        item.continuationItemRenderer?.continuationEndpoint?.commandExecutorCommand?.commands?.find(
          (c: any) => c.continuationCommand?.token
        )?.continuationCommand?.token;
      if (token) {
        nextContinuation = token;
      }
    }
  }

  return { videos, nextContinuation };
}

export async function fetchContinuationPage(
  continuationToken: string,
  channelName: string,
  channelId: string
): Promise<{ videos: any[]; nextContinuation: string | null }> {
  try {
    const resp = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8",
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
        continuation: continuationToken,
      }),
      cache: "no-store",
    });

    if (!resp.ok) return { videos: [], nextContinuation: null };

    const json = await resp.json();
    const actions = json?.onResponseReceivedActions || [];
    let continuationItems: any[] = [];

    for (const action of actions) {
      const items =
        action?.appendContinuationItemsAction?.continuationItems ||
        action?.reloadContinuationItemsCommand?.continuationItems;
      if (Array.isArray(items)) {
        continuationItems = continuationItems.concat(items);
      }
    }

    return extractVideosFromRichContents(continuationItems, channelName, channelId);
  } catch {
    return { videos: [], nextContinuation: null };
  }
}

export async function fetchChannelVideosPage(
  channelId: string,
  continuationToken?: string | null,
  fallbackChannelName: string = "Канал"
): Promise<{ videos: any[]; nextContinuation: string | null; channelTitle: string }> {
  if (continuationToken) {
    const pageData = await fetchContinuationPage(
      continuationToken,
      fallbackChannelName,
      channelId
    );
    return {
      videos: pageData.videos,
      nextContinuation: pageData.nextContinuation,
      channelTitle: fallbackChannelName,
    };
  }

  // Способ 1: Прямой парсинг вкладки /videos через HTML (ytInitialData)
  let channelTitle = fallbackChannelName;
  let allVideos: any[] = [];
  let nextContinuation: string | null = null;

  try {
    const targetUrl = `https://www.youtube.com/channel/${channelId}/videos`;
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8",
        Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+417",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const html = await res.text();
      const dataMatch = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
      if (dataMatch?.[1]) {
        const json = JSON.parse(dataMatch[1]);
        channelTitle =
          json?.metadata?.channelMetadataRenderer?.title ||
          json?.header?.pageHeaderRenderer?.pageTitle ||
          fallbackChannelName;

        const tabs = json?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
        const videosTab = tabs.find((t: any) => t?.tabRenderer?.content?.richGridRenderer);
        const contents = videosTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

        const extracted = extractVideosFromRichContents(contents, channelTitle, channelId);
        allVideos = extracted.videos;
        nextContinuation = extracted.nextContinuation;
      }
    }
  } catch {}

  // Способ 2 (Фоллбек): InnerTube browse endpoint
  if (allVideos.length === 0) {
    try {
      const resp = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
        cache: "no-store",
      });

      if (resp.ok) {
        const json = await resp.json();
        channelTitle =
          json?.metadata?.channelMetadataRenderer?.title ||
          json?.header?.pageHeaderRenderer?.pageTitle ||
          fallbackChannelName;
        const tabs = json?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
        const videosTab = tabs.find(
          (t: any) => t?.tabRenderer?.content?.richGridRenderer || t?.tabRenderer?.selected
        );
        const contents = videosTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

        const extracted = extractVideosFromRichContents(contents, channelTitle, channelId);
        allVideos = extracted.videos;
        nextContinuation = extracted.nextContinuation;
      }
    } catch {}
  }

  // Если на первой странице меньше 35 роликов и есть токен — сразу подгружаем вторую страницу,
  // чтобы гарантировать 35–60 роликов за раз!
  if (nextContinuation && allVideos.length < 35) {
    const secondPage = await fetchContinuationPage(nextContinuation, channelTitle, channelId);
    if (secondPage.videos.length > 0) {
      const seen = new Set(allVideos.map((v) => v.id));
      for (const v of secondPage.videos) {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          allVideos.push(v);
        }
      }
      nextContinuation = secondPage.nextContinuation;
    }
  }

  return {
    videos: allVideos,
    nextContinuation,
    channelTitle,
  };
}
