const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

const newLogic = `import Navbar from "@/components/Navbar";
import ClientCatalog from "@/components/ClientCatalog";
import { supabase } from "@/utils/supabase";

export const revalidate = 3600; // Cache for 1 hour, or until revalidatePath is called

export default async function Home() {
  const { data: categories } = await supabase.from('categories').select('*');
  const { data: genres } = await supabase.from('genres').select('*').order('order_index');
  const { data: content } = await supabase.from('content').select('*');

  const allMovies = (content || []).map(item => ({
    id: item.id,
    title: item.title,
    release_year: item.release_year,
    description: "",
    category: categories?.find(c => c.id === genres?.find(g => g.id === item.genre_id)?.category_id)?.name || "",
    cover_url: item.poster_url,
    telegram_url: item.telegram_link,
    is_collection: item.is_collection,
    genre_id: item.genre_id,
    collection_type: item.collection_type
  })).reverse();

  return (
    <main className="min-h-screen bg-[#141414] overflow-x-hidden w-full relative">
      <Navbar />
      <ClientCatalog 
        allGenres={genres || []} 
        allMovies={allMovies} 
        allCategories={categories || []} 
      />
    </main>
  );
}`;

fs.writeFileSync('src/app/page.tsx', newLogic);
