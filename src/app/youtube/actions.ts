"use server";

import { supabase } from "@/utils/supabase";
import { UserWord, YouTubeRecommendedVideo, EasyGermanVideo } from "@/types/youtube";

export async function saveWordAction(wordData: {
  word: string;
  translation: string;
  lemma?: string;
  sentence?: string;
  context_sentence?: string;
  channel_title?: string;
  source?: string;
  video_id?: string;
  video_title?: string;
}): Promise<{ success: boolean; data?: any; error?: string; savedTo?: string }> {
  const sentence = wordData.sentence?.trim() || wordData.context_sentence?.trim() || "";
  const channelTitle = wordData.channel_title?.trim() || "Общее";
  const videoTitle = wordData.video_title?.trim() || "";
  const videoId = wordData.video_id?.trim() || "";

  if (!wordData.word?.trim() || !wordData.translation?.trim()) {
    return { success: false, error: "Слово и перевод обязательны для сохранения" };
  }

  const cleanWord = wordData.word.trim();
  const cleanTranslation = wordData.translation.trim();
  const cleanLemma = wordData.lemma?.trim() || cleanWord;

  const fullPayload = {
    word: cleanWord,
    translation: cleanTranslation,
    lemma: cleanLemma,
    sentence,
    context_sentence: sentence,
    channel_title: channelTitle,
    video_title: videoTitle,
    source: wordData.source || "youtube",
    video_id: videoId,
    created_at: new Date().toISOString(),
  };

  // 1. Try to insert into user_words table in Supabase
  let insertedData: any = null;
  try {
    // First attempt: full payload with channel_title and video_title
    const { data, error } = await supabase
      .from("user_words")
      .insert(fullPayload)
      .select()
      .single();

    if (!error && data) {
      insertedData = data;
    } else if (error) {
      // If schema lacks channel_title or video_title columns (PGRST204), embed metadata into context_sentence
      const fallbackDbPayload = {
        word: cleanWord,
        translation: cleanTranslation,
        context_sentence: `${sentence}|||${channelTitle}|||${videoTitle}`,
        source: wordData.source || "youtube",
        video_id: videoId,
        created_at: new Date().toISOString(),
      };

      const { data: fbData, error: fbError } = await supabase
        .from("user_words")
        .insert(fallbackDbPayload)
        .select()
        .single();

      if (!fbError && fbData) {
        insertedData = fbData;
      }
    }
  } catch (err: any) {
    console.warn("user_words insert exception:", err?.message);
  }

  // 2. Synchronize with global_settings key 'user_saved_words'
  try {
    const { data: existingData } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "user_saved_words")
      .maybeSingle();

    let currentList: any[] = [];
    if (existingData?.value && Array.isArray(existingData.value)) {
      currentList = existingData.value;
    }

    const filtered = currentList.filter(
      (item) => item.word.toLowerCase() !== cleanWord.toLowerCase()
    );
    const updatedList = [
      { id: insertedData?.id || "word_" + Date.now(), ...fullPayload },
      ...filtered,
    ];

    await supabase
      .from("global_settings")
      .upsert({ key: "user_saved_words", value: updatedList });
  } catch {}

  return { success: true, savedTo: insertedData ? "user_words" : "global_settings", data: fullPayload };
}

export async function getSavedWordsAction(): Promise<{ success: boolean; data: UserWord[]; error?: string }> {
  const wordsMap = new Map<string, UserWord>();

  // 1. Try from user_words table
  try {
    const { data, error } = await supabase
      .from("user_words")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && Array.isArray(data)) {
      for (const d of data) {
        let text = d.context_sentence || d.sentence || "";
        let ch = d.channel_title || "Общее";
        let vt = d.video_title || "";

        if (text.includes("|||")) {
          const parts = text.split("|||");
          text = parts[0] || "";
          ch = parts[1] || ch;
          vt = parts[2] || vt;
        }

        const item: UserWord = {
          id: d.id,
          word: d.word,
          translation: d.translation,
          lemma: d.lemma || d.word,
          sentence: text,
          context_sentence: text,
          channel_title: ch,
          video_title: vt,
          video_id: d.video_id || "",
          source: d.source || "youtube",
          created_at: d.created_at || new Date().toISOString(),
        };
        wordsMap.set(item.word.toLowerCase(), item);
      }
    }
  } catch {}

  // 2. Merge with global_settings fallback for richer metadata
  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "user_saved_words")
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      for (const d of data.value) {
        const key = d.word.toLowerCase();
        if (wordsMap.has(key)) {
          const existing = wordsMap.get(key)!;
          if (!existing.video_title && d.video_title) {
            existing.video_title = d.video_title;
          }
          if ((!existing.channel_title || existing.channel_title === "Общее") && d.channel_title) {
            existing.channel_title = d.channel_title;
          }
        } else {
          wordsMap.set(key, {
            ...d,
            sentence: d.sentence || d.context_sentence || "",
            context_sentence: d.context_sentence || d.sentence || "",
            channel_title: d.channel_title || "Общее",
            video_title: d.video_title || "",
          });
        }
      }
    }
  } catch {}

  const result = Array.from(wordsMap.values());
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { success: true, data: result };
}

export async function deleteSavedWordAction(wordText: string): Promise<{ success: boolean }> {
  try {
    await supabase.from("user_words").delete().eq("word", wordText);
  } catch {}

  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "user_saved_words")
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      const filtered = data.value.filter((item: any) => item.word.toLowerCase() !== wordText.toLowerCase());
      await supabase.from("global_settings").upsert({ key: "user_saved_words", value: filtered });
    }
  } catch {}

  return { success: true };
}

export async function deleteVideoWordsAction(videoId: string): Promise<{ success: boolean }> {
  try {
    await supabase.from("user_words").delete().eq("video_id", videoId);
  } catch {}

  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "user_saved_words")
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      const filtered = data.value.filter((item: any) => item.video_id !== videoId);
      await supabase.from("global_settings").upsert({ key: "user_saved_words", value: filtered });
    }
  } catch {}

  return { success: true };
}

export async function clearChannelDeckAction(channelTitle: string): Promise<{ success: boolean }> {
  try {
    if (channelTitle === "all") {
      await supabase.from("user_words").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      await supabase.from("user_words").delete().or(`channel_title.eq.${channelTitle},context_sentence.ilike.%|||${channelTitle}|||%`);
    }
  } catch {}

  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "user_saved_words")
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      let filtered: any[] = [];
      if (channelTitle !== "all") {
        filtered = data.value.filter((item: any) => (item.channel_title || "Общее") !== channelTitle);
      }
      await supabase.from("global_settings").upsert({ key: "user_saved_words", value: filtered });
    }
  } catch {}

  return { success: true };
}

export async function getFavoritesAction(): Promise<{ success: boolean; data: YouTubeRecommendedVideo[] }> {
  const list: YouTubeRecommendedVideo[] = [];
  try {
    const { data, error } = await supabase
      .from("user_favorites")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      for (const d of data) {
        list.push({
          id: d.video_id || d.id,
          title: d.title || "",
          channel: d.channel_title || d.channel || "YouTube",
          level: (d.level as any) || "B1",
          thumbnailUrl: d.thumbnail_url || `https://i.ytimg.com/vi/${d.video_id || d.id}/hqdefault.jpg`,
          durationText: d.duration || d.durationText || "",
        });
      }
      return { success: true, data: list };
    }
  } catch {}

  // Fallback to global_settings if table was empty or missing
  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "user_favorites")
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      return { success: true, data: data.value };
    }
  } catch {}

  return { success: true, data: list };
}

export async function toggleFavoriteAction(
  video: YouTubeRecommendedVideo
): Promise<{ success: boolean; isFavorite: boolean }> {
  let isFav = false;
  try {
    const { data } = await supabase
      .from("user_favorites")
      .select("id")
      .eq("video_id", video.id)
      .maybeSingle();

    if (data?.id) {
      await supabase.from("user_favorites").delete().eq("video_id", video.id);
      isFav = false;
    } else {
      await supabase.from("user_favorites").insert({
        video_id: video.id,
        title: video.title,
        channel_title: video.channel,
        thumbnail_url: video.thumbnailUrl,
        duration: video.durationText || "",
        level: video.level || "B1",
        created_at: new Date().toISOString(),
      });
      isFav = true;
    }
  } catch {
    // If table doesn't exist, we will toggle in global_settings below
  }

  // Synchronize with global_settings
  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "user_favorites")
      .maybeSingle();
    let current: any[] = [];
    if (data?.value && Array.isArray(data.value)) {
      current = data.value;
    }
    const exists = current.some((v: any) => v.id === video.id);
    let updated: any[];
    if (exists) {
      updated = current.filter((v: any) => v.id !== video.id);
      isFav = false;
    } else {
      updated = [video, ...current.filter((v: any) => v.id !== video.id)];
      isFav = true;
    }
    await supabase.from("global_settings").upsert({ key: "user_favorites", value: updated });
  } catch {}

  return { success: true, isFavorite: isFav };
}

export async function removeFavoriteAction(videoId: string): Promise<{ success: boolean }> {
  try {
    await supabase.from("user_favorites").delete().eq("video_id", videoId);
  } catch {}
  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "user_favorites")
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      const filtered = data.value.filter((v: any) => v.id !== videoId);
      await supabase.from("global_settings").upsert({ key: "user_favorites", value: filtered });
    }
  } catch {}
  return { success: true };
}

/**
 * Easy German: получение просмотренных ID и добавленных пользователем видео из Supabase
 */
export async function getEasyGermanStateAction(): Promise<{
  watchedIds: string[];
  customVideos: EasyGermanVideo[];
}> {
  const watchedSet = new Set<string>();
  const customMap = new Map<string, EasyGermanVideo>();

  // 1. Попытка чтения из таблицы easy_german_watched
  try {
    const { data, error } = await supabase.from("easy_german_watched").select("*");
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (row.youtube_id && row.is_watched !== false) {
          watchedSet.add(row.youtube_id);
        }
      }
    }
  } catch {}

  // 2. Синхронизация из global_settings (easy_german_watched_ids)
  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "easy_german_watched_ids")
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      for (const id of data.value) {
        if (typeof id === "string") watchedSet.add(id);
      }
    }
  } catch {}

  // 3. Попытка чтения пользовательских видео из easy_german_videos / global_settings
  try {
    const [{ data: customData }, { data: videosData }] = await Promise.all([
      supabase.from("global_settings").select("value").eq("key", "easy_german_custom_videos").maybeSingle(),
      supabase.from("global_settings").select("value").eq("key", "easy_german_videos").maybeSingle(),
    ]);

    const allCustom = [
      ...(Array.isArray(customData?.value) ? customData.value : []),
      ...(Array.isArray(videosData?.value) ? videosData.value : []),
    ];

    for (const v of allCustom) {
      if (v && v.youtube_id) {
        customMap.set(v.youtube_id, v);
      }
    }
  } catch {}

  return {
    watchedIds: Array.from(watchedSet),
    customVideos: Array.from(customMap.values()),
  };
}

/**
 * Easy German: переключение статуса is_watched в Supabase
 */
export async function toggleEasyGermanWatchedAction(
  youtubeId: string,
  isWatched: boolean
): Promise<{ success: boolean }> {
  try {
    if (isWatched) {
      await supabase.from("easy_german_watched").upsert({
        youtube_id: youtubeId,
        is_watched: true,
        updated_at: new Date().toISOString(),
      });
    } else {
      await supabase.from("easy_german_watched").delete().eq("youtube_id", youtubeId);
    }
  } catch {}

  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "easy_german_watched_ids")
      .maybeSingle();
    let current: string[] = Array.isArray(data?.value) ? data.value : [];
    if (isWatched) {
      if (!current.includes(youtubeId)) current = [youtubeId, ...current];
    } else {
      current = current.filter((id) => id !== youtubeId);
    }
    await supabase
      .from("global_settings")
      .upsert({ key: "easy_german_watched_ids", value: current });
  } catch {}

  return { success: true };
}

/**
 * Easy German: сохранение нового ролика в Supabase
 */
export async function addEasyGermanVideoAction(
  video: EasyGermanVideo
): Promise<{ success: boolean }> {
  try {
    await supabase.from("easy_german_videos").insert({
      id: video.id,
      youtube_id: video.youtube_id,
      title: video.title,
      level: video.level,
      duration_str: video.duration_str || video.duration || "",
      is_watched: Boolean(video.is_watched),
      created_at: video.created_at || new Date().toISOString(),
    });
  } catch {}

  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "easy_german_custom_videos")
      .maybeSingle();
    const current: EasyGermanVideo[] = Array.isArray(data?.value) ? data.value : [];
    const filtered = current.filter((v) => v.youtube_id !== video.youtube_id);
    const updated = [...filtered, video];
    await Promise.all([
      supabase.from("global_settings").upsert({ key: "easy_german_custom_videos", value: updated }),
      supabase.from("global_settings").upsert({ key: "easy_german_videos", value: updated }),
    ]);
  } catch {}

  return { success: true };
}

/**
 * Easy German: пакетное обновление роликов в global_settings
 */
export async function updateEasyGermanVideosAction(
  videos: EasyGermanVideo[]
): Promise<{ success: boolean }> {
  try {
    await Promise.all([
      supabase.from("global_settings").upsert({ key: "easy_german_custom_videos", value: videos }),
      supabase.from("global_settings").upsert({ key: "easy_german_videos", value: videos }),
    ]);
    return { success: true };
  } catch (err) {
    console.error("Failed to update easy_german_videos:", err);
    return { success: false };
  }
}

/**
 * Easy German: удаление ролика из Supabase и global_settings
 */
export async function deleteEasyGermanVideoAction(
  videoIdOrYoutubeId: string
): Promise<{ success: boolean }> {
  try {
    await supabase
      .from("easy_german_videos")
      .delete()
      .or(`id.eq.${videoIdOrYoutubeId},youtube_id.eq.${videoIdOrYoutubeId}`);
  } catch {}

  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "easy_german_custom_videos")
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      const filtered = data.value.filter(
        (v: EasyGermanVideo) =>
          v.id !== videoIdOrYoutubeId && v.youtube_id !== videoIdOrYoutubeId
      );
      await Promise.all([
        supabase.from("global_settings").upsert({ key: "easy_german_custom_videos", value: filtered }),
        supabase.from("global_settings").upsert({ key: "easy_german_videos", value: filtered }),
      ]);
    }
  } catch {}

  return { success: true };
}

/**
 * Получение названия и длительности ролика YouTube по его ID
 */
export async function fetchYouTubeVideoMetadataAction(videoId: string): Promise<{
  title: string;
  duration_str: string;
}> {
  let title = `Easy German Video (${videoId})`;
  let duration_str = "";

  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const html = await res.text();
      // 1. Извлечение длительности
      const durMsMatch = html.match(/"approxDurationMs":"(\d+)"/);
      const lenSecMatch = html.match(/"lengthSeconds":"(\d+)"/);
      let sec = 0;
      if (durMsMatch) sec = Math.round(Number(durMsMatch[1]) / 1000);
      else if (lenSecMatch) sec = Number(lenSecMatch[1]);

      if (sec > 0) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        duration_str =
          h > 0
            ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
            : `${m}:${s.toString().padStart(2, "0")}`;
      }

      // 2. Извлечение названия
      const titleMatch =
        html.match(/<title>([^<]+)<\/title>/i) ||
        html.match(/"title":"([^"]+)"/);
      if (titleMatch && titleMatch[1]) {
        let cleanTitle = titleMatch[1].replace(/ - YouTube$/i, "").trim();
        if (cleanTitle) {
          title = cleanTitle;
        }
      }
    }
  } catch {}

  // Запасной вариант для названия через noembed, если название не определилось
  if (title.startsWith("Easy German Video")) {
    try {
      const fallbackRes = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      );
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        if (data.title) title = data.title;
      }
    } catch {}
  }

  return { title, duration_str };
}



