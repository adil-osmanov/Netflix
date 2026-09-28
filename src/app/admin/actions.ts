"use server";

import { supabase } from "@/utils/supabase";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw error;
  
  const order = ['Фильмы', 'Сериалы', 'Мультфильмы'];
  return (data || []).sort((a, b) => {
    let indexA = order.indexOf(a.name);
    let indexB = order.indexOf(b.name);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    return indexA - indexB;
  });
}

export async function getGenres() {
  const { data, error } = await supabase.from('genres').select('*, categories(name)').order('order_index');
  if (error) throw error;
  return data;
}

export async function addGenre(name: string, category_id: string, order_index: number) {
  const { data, error } = await supabase.from('genres').insert([{
    name,
    category_id,
    order_index
  }]).select();
  
  if (error) return { success: false, error: error.message };
  revalidatePath('/');
  return { success: true, data };
}

export async function swapGenreOrder(genre1: { id: string, order_index: number }, genre2: { id: string, order_index: number }) {
  // Swap their order indexes
  const { error: err1 } = await supabase.from('genres').update({ order_index: genre2.order_index }).eq('id', genre1.id);
  const { error: err2 } = await supabase.from('genres').update({ order_index: genre1.order_index }).eq('id', genre2.id);
  
  if (err1 || err2) return { success: false, error: "Failed to update order" };
  return { success: true };
}

export async function deleteGenreAction(genreId: string) {
  const { error } = await supabase.from('genres').delete().eq('id', genreId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/');
  return { success: true };
}

export async function updateGenreAction(genreId: string, newName: string) {
  try {
    const { error } = await supabase
      .from('genres')
      .update({ name: newName })
      .eq('id', genreId);

    if (error) {
      console.error("Error updating genre:", error);
      return { success: false, error: error.message };
    }
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reorderGenresAction(orderedIds: string[]) {
  try {
    // Loop through the ordered IDs and update their order_index
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('genres')
        .update({ order_index: i })
        .eq('id', orderedIds[i]);
      if (error) {
        console.error("Error reordering genre:", error);
        return { success: false, error: error.message };
      }
    }
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
