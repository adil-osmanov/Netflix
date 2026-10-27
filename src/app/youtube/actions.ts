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
}): Promise<{ success: boolean; data?: any; error?: string; savedTo?: string }> {
  const sentence = wordData.sentence?.trim() || wordData.context_sentence?.trim() || "";
  const payload = {
    word: wordData.word.trim(),
    translation: wordData.translation.trim(),
    lemma: wordData.lemma?.trim() || wordData.word.trim(),
    sentence,
    context_sentence: sentence,
    channel_title: wordData.channel_title?.trim() || "Общее",
    source: wordData.source || "youtube",
    video_id: wordData.video_id || "",
    created_at: new Date().toISOString(),
  };

  if (!payload.word || !payload.translation) {
    return { success: false, error: "Слово и перевод обязательны для сохранения" };
  }

  // 1. Try to insert into user_words table in Supabase
  try {
    const { data, error } = await supabase
      .from("user_words")
      .insert(payload)
      .select()
      .single();

    if (!error) {
      return { success: true, savedTo: "user_words", data };
    }

    console.warn("user_words insert failed, using fallback:", error.message);
  } catch (err: any) {
    console.warn("user_words error, falling back:", err?.message);
  }

  // 2. Safe Fallback: save to global_settings key 'user_saved_words'
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

    // Add unique word at top
    const filtered = currentList.filter(
      (item) => item.word.toLowerCase() !== payload.word.toLowerCase()
    );
    const updatedList = [
      { id: "word_" + Date.now(), ...payload },
      ...filtered,
    ];

    const { error: upsertError } = await supabase
      .from("global_settings")
      .upsert({ key: "user_saved_words", value: updatedList });

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return { success: true, savedTo: "global_settings", data: payload };
  } catch (fallbackErr: any) {
    return { success: false, error: fallbackErr?.message || "Ошибка сохранения слова" };
  }
}

export async function getSavedWordsAction(): Promise<{ success: boolean; data: UserWord[]; error?: string }> {
  // 1. Try from user_words
  try {
    const { data, error } = await supabase
      .from("user_words")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return {
        success: true,
        data: data.map((d: any) => ({
          ...d,
          sentence: d.sentence || d.context_sentence || "",
          context_sentence: d.context_sentence || d.sentence || "",
          channel_title: d.channel_title || "Общее",
        })),
      };
    }
  } catch {}

  // 2. Fallback to global_settings
  try {
    const { data } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "user_saved_words")
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      return {
        success: true,
        data: data.value.map((d: any) => ({
          ...d,
          sentence: d.sentence || d.context_sentence || "",
          context_sentence: d.context_sentence || d.sentence || "",
          channel_title: d.channel_title || "Общее",
        })),
      };
    }

    return { success: true, data: [] };
  } catch (err: any) {
    return { success: false, data: [], error: err?.message };
  }
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

export async function clearChannelDeckAction(channelTitle: string): Promise<{ success: boolean }> {
  try {
    if (channelTitle === "all") {
      await supabase.from("user_words").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      await supabase.from("user_words").delete().eq("channel_title", channelTitle);
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
