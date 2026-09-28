"use server";

import { supabase } from "@/utils/supabase";
import { revalidatePath } from "next/cache";

export async function getEpisodesAction(contentId: string) {
  const { data, error } = await supabase.from('episodes')
    .select('*')
    .eq('content_id', contentId)
    .order('order_index');
    
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteContentAction(contentId: string) {
  // Get poster_url before deleting
  const { data: contentData } = await supabase.from('content').select('poster_url').eq('id', contentId).single();
  
  const { error } = await supabase.from('content').delete().eq('id', contentId);
  if (error) return { success: false, error: error.message };

  // Delete the old poster from storage
  if (contentData && contentData.poster_url) {
    const fileName = contentData.poster_url.split('/').pop();
    if (fileName) {
      await supabase.storage.from('posters').remove([fileName]);
    }
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateContentGenreAction(contentId: string, genreId: string) {
  const { error } = await supabase.from('content').update({ genre_id: genreId }).eq('id', contentId);
  if (error) return { success: false, error: error.message };
  
  revalidatePath('/');
  return { success: true };
}

export async function uploadPosterAction(formData: FormData) {
  try {
    const imageFile = formData.get('poster') as File | null;
    const oldImageUrl = formData.get('oldImageUrl') as string | null;

    if (!imageFile || imageFile.size === 0) {
      throw new Error("No file provided");
    }

    console.log("SERVER: File being uploaded:", imageFile.name, imageFile.size, imageFile.type);

    // If there's an old image, delete it to save space
    if (oldImageUrl) {
      const oldFileName = oldImageUrl.split('/').pop();
      if (oldFileName) {
        await supabase.storage.from('posters').remove([oldFileName]);
      }
    }

    // Safe File Names
    const safeName = imageFile.name.replace(/[^a-zA-Z0-9.]/g, '');
    const filePath = `${Date.now()}-${safeName}`;
    
    let uploadError = null;

    const { error: initialUploadError } = await supabase.storage
      .from('posters')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false
      });
      
    uploadError = initialUploadError;
    
    if (uploadError && uploadError.message === 'Bucket not found') {
      console.log("SERVER: Bucket not found. Attempting to create 'posters' bucket automatically...");
      
      const { error: createError } = await supabase.storage.createBucket('posters', {
        public: true,
        allowedMimeTypes: ['image/*']
      });
      
      if (createError) {
        console.error("SERVER: Failed to create bucket:", createError);
        return { 
          success: false, 
          error: "Bucket not found and failed to create it automatically. Please create 'posters' bucket in Supabase.", 
          details: { name: createError.name, message: createError.message } 
        };
      }
      
      // Retry upload after creating bucket
      const { error: retryError } = await supabase.storage
        .from('posters')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      uploadError = retryError;
    }
    
    if (uploadError) {
      console.error("SERVER: SUPABASE UPLOAD ERROR:", uploadError);
      return { 
        success: false, 
        error: uploadError.message, 
        details: { name: uploadError.name, message: uploadError.message } 
      };
    }
    
    const { data: publicUrlData } = supabase.storage
      .from('posters')
      .getPublicUrl(filePath);
      
    return { success: true, url: publicUrlData.publicUrl };
  } catch (error: any) {
    console.error("SERVER: CATCH ERROR:", error);
    return { success: false, error: error.message || "Failed to upload image" };
  }
}

export async function searchAllContentAction() {
  try {
    const { data: contentData, error } = await supabase
      .from('content')
      .select('*');
      
    if (error) throw error;
    
    return {
      success: true,
      data: contentData?.map(item => ({
        id: item.id,
        title: item.title,
        release_year: item.release_year,
        description: "",
        category: "",
        cover_url: item.poster_url,
        telegram_url: item.telegram_link,
        is_collection: item.is_collection,
        genre_id: item.genre_id,
        collection_type: item.collection_type
      })) || []
    };
  } catch (error: any) {
    console.error('search error:', error);
    return { success: false, data: [] };
  }
}

export async function getCollectionPartsInfoAction(contentId: string, collectionType: string) {
  try {
    const { data } = await supabase
      .from('content_items')
      .select('season_number')
      .eq('content_id', contentId);
      
    if (data && data.length > 0) {
      if (collectionType === 'series') {
        const seasons = new Set(data.map(item => item.season_number));
        return `${seasons.size} ${seasons.size === 1 ? 'сезон' : (seasons.size < 5 ? 'сезона' : 'сезонов')}`;
      } else {
        const count = data.length;
        return `${count} ${count === 1 ? 'часть' : (count < 5 ? 'части' : 'частей')}`;
      }
    }
    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getLastWatchedAction(category: string) {
  const { data, error } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'lastWatched_' + category)
    .single();
  if (error || !data) return null;
  return data.value;
}

export async function setLastWatchedAction(category: string, value: any) {
  const { error } = await supabase
    .from('global_settings')
    .upsert({ key: 'lastWatched_' + category, value: value });
  return !error;
}
