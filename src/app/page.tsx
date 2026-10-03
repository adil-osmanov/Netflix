import Navbar from "@/components/Navbar";
import ClientCatalog from "@/components/ClientCatalog";
import { Suspense } from "react";
import { supabase } from "@/utils/supabase";

export const revalidate = 3600; // Cache for 1 hour, or until revalidatePath is called

// Triggering Vercel rebuild for cache invalidation option 3
export default async function Home() {
  const { data: categories } = await supabase.from('categories').select('*');
  const { data: genres } = await supabase.from('genres').select('*').order('order_index');
  const { data: content } = await supabase.from('content').select('*').order('created_at', { ascending: false });
  const { data: allEpisodes } = await supabase.from('episodes').select('content_id, title');

  // Pre-calculate collection counts
  const collectionCounts: Record<string, { total: number, uniqueSeasons: number }> = {};
  if (allEpisodes) {
    allEpisodes.forEach(ep => {
      if (!collectionCounts[ep.content_id]) {
        collectionCounts[ep.content_id] = { total: 0, uniqueSeasons: 0 };
      }
      collectionCounts[ep.content_id].total += 1;
    });
    
    // Group by content_id to calculate unique seasons
    const epsByContent = allEpisodes.reduce((acc, ep) => {
      if (!acc[ep.content_id]) acc[ep.content_id] = [];
      acc[ep.content_id].push(ep);
      return acc;
    }, {} as Record<string, any[]>);
    
    for (const [contentId, eps] of Object.entries(epsByContent)) {
      const seasons = eps.map(ep => {
        try {
          const parsed = JSON.parse(ep.title);
          return parsed.season || 1;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      collectionCounts[contentId].uniqueSeasons = new Set(seasons).size;
    }
  }

  const allMovies = (content || []).map(item => {
    const counts = collectionCounts[item.id] || { total: 0, uniqueSeasons: 0 };
    return {
      id: item.id,
      title: item.title,
      release_year: item.release_year,
      description: "",
      category: categories?.find(c => c.id === genres?.find(g => g.id === item.genre_id)?.category_id)?.name || "",
      cover_url: item.poster_url,
      telegram_url: item.telegram_link,
      is_collection: item.is_collection,
      genre_id: item.genre_id,
      collection_type: item.collection_type,
      has_subtitles: item.has_subtitles,
      collectionCount: item.collection_type === 'series' ? counts.uniqueSeasons : counts.total,
      totalEpisodesCount: counts.total
    };
  });

  return (
    <main className="min-h-screen bg-[#141414] overflow-x-hidden w-full relative">
      <Navbar />
      <Suspense fallback={<div className="min-h-screen w-full bg-[#141414]" />}>
        <ClientCatalog 
          allGenres={genres || []} 
          allMovies={allMovies} 
          allCategories={categories || []} 
        />
      </Suspense>
    </main>
  );
}