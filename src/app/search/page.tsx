import Navbar from "@/components/Navbar";
import { supabase } from "@/utils/supabase";
import MovieCard from "@/components/MovieCard";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q;
  
  if (!q || typeof q !== 'string') {
    redirect('/');
  }

  const { data: movies } = await supabase
    .from('movies')
    .select('*')
    .ilike('title', `%${q}%`);

  const channelId = process.env.TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
  
  const formattedMovies = (movies || []).map(movie => ({
    id: movie.id,
    title: movie.title,
    description: movie.description || "",
    category: movie.category || "General",
    cover_url: movie.cover_url,
    telegram_url: `https://t.me/c/${channelId}/${movie.telegram_message_id}`
  }));

  return (
    <main className="min-h-screen bg-[#141414] pt-28 md:pt-32 pb-12 w-full">
      <Navbar />
      
      <div className="w-full">
        <h1 className="text-2xl font-semibold text-white mb-6 px-4 md:px-10">
          Search results for "{q}"
        </h1>
        
        {formattedMovies.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4 md:px-10">
            {formattedMovies.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="px-4 md:px-10 text-gray-500 text-lg">
            No movies found.
          </div>
        )}
      </div>
    </main>
  );
}
