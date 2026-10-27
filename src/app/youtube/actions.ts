"use server";

import { supabase } from "@/utils/supabase";
import { UserWord } from "@/types/youtube";

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
