"use server";

import { supabase } from "@/utils/supabase";
import { revalidatePath } from "next/cache";

export async function getGenreById(genreId: string) {
  const { data, error } = await supabase.from('genres').select('*, categories(name)').eq('id', genreId).single();
  if (error) return null;
  return data;
}

export async function getGenresByCategory(categoryId: string) {
  const { data, error } = await supabase.from('genres').select('*').eq('category_id', categoryId).order('order_index');
  if (error) return [];
  return data;
}

export async function saveContentAction(formData: FormData, contentId?: string) {
  try {
    const title = formData.get('title') as string;
    const genre_id = formData.get('genre_id') as string;
    const is_collection = formData.get('is_collection') === 'true';
    const poster_url = formData.get('poster_url') as string;
    const collection_type = formData.get('collection_type') as string || null;
    const release_year = formData.get('release_year') as string || null;

    if (!poster_url) throw new Error("Poster URL is required");

    let messageId = null;
    if (!is_collection) {
      const tgLink = formData.get('telegram_link') as string;
      if (tgLink) {
        const match = tgLink.match(/\/(\d+)\/?$/);
        if (match && match[1]) {
          messageId = parseInt(match[1], 10);
        } else if (!isNaN(Number(tgLink))) {
          messageId = parseInt(tgLink, 10);
        }
      }
    }

    const payload = {
      title,
      genre_id,
      poster_url,
      is_collection,
      collection_type,
      release_year,
      telegram_link: messageId ? String(messageId) : null,
    };

    let contentData;
    
    if (contentId) {
      // UPDATE
      console.log("SERVER: Updating content", contentId, payload);
      const { data, error } = await supabase.from('content').update(payload).eq('id', contentId).select().single();
      if (error) {
        console.error("SERVER: Update Error:", error);
        throw error;
      }
      contentData = data;
      
      // Delete old episodes if editing a collection to replace them
      if (is_collection) {
        await supabase.from('episodes').delete().eq('content_id', contentId);
      }
    } else {
      // INSERT
      console.log("SERVER: Inserting new content", payload);
      const { data, error } = await supabase.from('content').insert([payload]).select().single();
      if (error) {
        console.error("SERVER: Insert Error:", error);
        throw error;
      }
      contentData = data;
      console.log("SERVER: Inserted successfully", contentData.id);
    }

    // Handle Episodes
    if (is_collection) {
      const episodesStr = formData.get('episodes') as string;
      if (episodesStr) {
        const episodes = JSON.parse(episodesStr);
        const episodesToInsert = episodes.map((ep: any, index: number) => {
          let epMessageId = null;
          const match = ep.telegram_link.match(/\/(\d+)\/?$/);
          if (match && match[1]) {
            epMessageId = match[1];
          } else if (!isNaN(Number(ep.telegram_link))) {
            epMessageId = ep.telegram_link;
          }

          const defaultTitle = collection_type === 'franchise' ? `Часть ${index + 1}` : `Серия ${index + 1}`;
          return {
            content_id: contentData.id,
            title: ep.title || defaultTitle,
            telegram_link: epMessageId ? String(epMessageId) : ep.telegram_link,
            order_index: index,
          };
        });

        if (episodesToInsert.length > 0) {
          const { error: epsError } = await supabase.from('episodes').insert(episodesToInsert);
          if (epsError) throw epsError;
        }
      }
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save content" };
  }
}
