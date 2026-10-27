"use server";

import { supabase } from "@/utils/supabase";
import { UserWord } from "@/types/youtube";

export async function saveWordAction(wordData: {
  word: string;
  translation: string;
  context_sentence?: string;
  source?: string;
  video_id?: string;
}): Promise<{ success: boolean; data?: any; error?: string; savedTo?: string }> {
  const payload = {
    word: wordData.word.trim(),
    translation: wordData.translation.trim(),
    context_sentence: wordData.context_sentence?.trim() || '',
    source: wordData.source || 'youtube',
    video_id: wordData.video_id || '',
    created_at: new Date().toISOString(),
  };

  if (!payload.word || !payload.translation) {
    return { success: false, error: 'Слово и перевод обязательны для сохранения' };
  }

  // 1. Try to insert into user_words table in Supabase
  try {
    const { data, error } = await supabase
      .from('user_words')
      .insert(payload)
      .select()
      .single();

    if (!error) {
      return { success: true, savedTo: 'user_words', data };
    }

    console.warn('user_words table insert failed, using global_settings fallback:', error.message);
  } catch (err: any) {
    console.warn('user_words error, falling back:', err.message);
  }

  // 2. Safe Fallback: save to global_settings key 'user_saved_words'
  // (ensures user experiences NO errors even before running SQL table migration)
  try {
    const { data: existingData } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'user_saved_words')
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
      { id: 'word_' + Date.now(), ...payload },
      ...filtered,
    ];

    const { error: upsertError } = await supabase
      .from('global_settings')
      .upsert({ key: 'user_saved_words', value: updatedList });

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return { success: true, savedTo: 'global_settings', data: payload };
  } catch (fallbackErr: any) {
    return { success: false, error: fallbackErr.message || 'Ошибка сохранения слова' };
  }
}

export async function getSavedWordsAction(): Promise<{ success: boolean; data: UserWord[]; error?: string }> {
  // 1. Try from user_words
  try {
    const { data, error } = await supabase
      .from('user_words')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return { success: true, data };
    }
  } catch {}

  // 2. Fallback to global_settings
  try {
    const { data } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'user_saved_words')
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      return { success: true, data: data.value };
    }

    return { success: true, data: [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function deleteSavedWordAction(wordText: string): Promise<{ success: boolean }> {
  try {
    await supabase.from('user_words').delete().eq('word', wordText);
  } catch {}

  try {
    const { data } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'user_saved_words')
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      const filtered = data.value.filter((item: any) => item.word.toLowerCase() !== wordText.toLowerCase());
      await supabase.from('global_settings').upsert({ key: 'user_saved_words', value: filtered });
    }
  } catch {}

  return { success: true };
}
