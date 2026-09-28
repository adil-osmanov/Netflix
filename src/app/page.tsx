import Navbar from "@/components/Navbar";
import ClientCatalog from "@/components/ClientCatalog";
import { supabase } from "@/utils/supabase";

import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  noStore();
  
  const resolvedSearchParams = await searchParams;
  const categoryParam = (resolvedSearchParams.category as string) || 'all';

  const categoryMap: Record<string, string> = {
    movies: 'Фильмы',
    series: 'Сериалы',
    cartoons: 'Мультфильмы',
    all: 'Главная'
  };
  const categoryName = categoryMap[categoryParam] || 'Главная';

  let genres = [];
  let contentData = [];

  if (categoryParam === 'all') {
    // Fetch ALL content for the global home feed
    const { data: allContent } = await supabase
      .from('content')
      .select('*');
      
    // Reverse the array to simulate newest-first since there's no created_at
    contentData = (allContent || []).reverse();
    // Leave genres empty to signal ClientCatalog to render a flat grid
    genres = [];
  } else {
    // 1. Find the category ID
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .single();

    if (!categoryData) {
      return (
        <main className="min-h-screen bg-[#141414] flex flex-col items-center justify-center text-white w-full">
          <Navbar />
          <h1>Category "{categoryName}" not found in database.</h1>
        </main>
      );
    }

    // 2. Fetch genres for this category, ordered by order_index
    const { data: catGenres } = await supabase
      .from('genres')
      .select('*')
      .eq('category_id', categoryData.id)
      .order('order_index');
      
    genres = catGenres || [];

    // 3. Fetch content for these genres
    const genreIds = genres.map(g => g.id) || [];
    if (genreIds.length > 0) {
      const { data: catContent } = await supabase
        .from('content')
        .select('*')
        .in('genre_id', genreIds);
      contentData = (catContent || []).reverse();
    }
  }

  // Create a fast map to associate content category for dynamic tag logic
  const allMovies = contentData.map(item => ({
    id: item.id,
    title: item.title,
    description: "",
    category: categoryParam === 'all' ? (item.collection_type === 'series' ? 'Сериалы' : 'Фильмы') : categoryName,
    cover_url: item.poster_url,
    telegram_url: item.telegram_link,
    is_collection: item.is_collection,
    genre_id: item.genre_id,
    collection_type: item.collection_type
  })) || [];

  const heroMovie = allMovies.length > 0 ? allMovies[0] : undefined;

  return (
    <main className="min-h-screen bg-[#141414] overflow-x-hidden w-full relative">
      <Navbar />
      <ClientCatalog genres={genres} movies={allMovies} heroMovie={heroMovie} />
    </main>
  );
}
