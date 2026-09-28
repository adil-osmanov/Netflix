"use server";

import { supabase } from "@/utils/supabase";

export async function getWatchedHistoryAction() {
  const { data, error } = await supabase.from('watched_history').select('*');
  if (error) {
    console.error("Error fetching watched history:", error);
    return [];
  }
  return data || [];
}

export async function toggleWatchedAction(contentId: string, episodeId: string | null = null, isWatched: boolean) {
  try {
    // Delete existing record to prevent unique constraint issues with nulls
    let delQuery = supabase.from('watched_history').delete().eq('content_id', contentId);
    if (episodeId) {
      delQuery = delQuery.eq('episode_id', episodeId);
    } else {
      delQuery = delQuery.is('episode_id', null);
    }
    await delQuery;

    if (isWatched) {
      const { error } = await supabase.from('watched_history').insert({
        content_id: contentId,
        episode_id: episodeId,
        is_watched: true
      });
      if (error) throw error;
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error toggling watched status:", error);
    return { success: false, error: error.message };
  }
}
