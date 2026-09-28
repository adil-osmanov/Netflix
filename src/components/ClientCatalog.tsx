"use client";

import { useSearch } from "./SearchContext";
import MovieRow from "./MovieRow";
import MovieCard, { Movie } from "./MovieCard";
import Hero from "./Hero";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import AddContentModal from "./AddContentModal";
import { searchAllContentAction } from "@/app/actions";

interface Genre {
  id: string;
  name: string;
}

interface ClientCatalogProps {
  genres: Genre[];
  movies: Movie[];
  heroMovie?: Movie;
}

export default function ClientCatalog({ genres, movies, heroMovie }: ClientCatalogProps) {
  const { searchTerm } = useSearch();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [globalMovies, setGlobalMovies] = useState<Movie[]>([]);
  const [hideAddButtons, setHideAddButtons] = useState(false);

  useEffect(() => {
    const checkSettings = () => setHideAddButtons(localStorage.getItem('netflix_hide_add_buttons') === 'true');
    checkSettings();
    window.addEventListener('storage', checkSettings);
    return () => window.removeEventListener('storage', checkSettings);
  }, []);

  useEffect(() => {
    if (searchTerm.trim() && globalMovies.length === 0) {
      searchAllContentAction().then(res => {
        if (res.success) {
          setGlobalMovies(res.data);
        }
      });
    }
  }, [searchTerm, globalMovies.length]);

  const genreFilter = searchParams.get('genre');
  const genreName = searchParams.get('genreName');

  // SEARCH VIEW
  if (searchTerm.trim()) {
    const lowerQuery = searchTerm.toLowerCase();
    const sourceMovies = globalMovies.length > 0 ? globalMovies : movies;
    const filteredMovies = sourceMovies.filter(m => 
      m.title.toLowerCase().includes(lowerQuery)
    );

    return (
      <div className="pt-28 px-4 md:px-12 w-full z-10 relative">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-medium text-zinc-400">
            Результаты поиска: <span className="text-white">"{searchTerm}"</span>
          </h1>
        </div>
        
        {filteredMovies.length === 0 ? (
          <div className="text-zinc-500 mt-20 text-center text-lg">Нет результатов, соответствующих вашему запросу.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-x-2 gap-y-4 md:gap-y-8 pb-40">
            {filteredMovies.map(movie => (
              <div key={movie.id} className="w-full">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // GENRE GRID VIEW (User clicked on a genre title)
  if (genreFilter) {
    const genreMovies = movies.filter(m => m.genre_id === genreFilter);
    return (
      <div className="pt-28 px-4 md:px-12 w-full z-10 relative">
        <div className="mb-6 flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800/50 hover:bg-zinc-700 text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl md:text-4xl font-bold text-white">
            {genreName || "Категория"}
          </h1>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-x-2 gap-y-4 md:gap-y-8 pb-40">
          {genreMovies.map(movie => (
            <div key={movie.id} className="w-full">
              <MovieCard movie={movie} />
            </div>
          ))}

          {/* Add Button Inside Grid */}
          {!hideAddButtons && <div 
            onClick={() => setAddModalOpen(true)}
            className="w-full aspect-video flex flex-col items-center justify-center border border-zinc-700/50 bg-[#141414] text-zinc-500 hover:text-white hover:border-white hover:bg-zinc-800/50 cursor-pointer transition-all duration-300 rounded-md shadow-md group"
          >
            <Plus className="w-8 h-8 md:w-10 md:h-10 mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-xs md:text-sm text-center px-2 tracking-wide">Добавить в {genreName || "категорию"}</span>
          </div>}
        </div>

        <AddContentModal 
          genreId={genreFilter} 
          isOpen={addModalOpen} 
          onClose={() => setAddModalOpen(false)} 
        />
      </div>
    );
  }

  // STANDARD CATEGORY MODE / HOME MODE
  if (genres.length === 0) {
    return (
      <div className="pt-28 px-4 md:px-12 w-full z-10 relative pb-40">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-x-2 gap-y-4 md:gap-y-8">
          {movies.map(movie => (
            <div key={movie.id} className="w-full">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // STANDARD CATEGORY MODE (WITH GENRES)
  const contentMap: Record<string, Movie[]> = {};
  genres.forEach(g => contentMap[g.id] = []);
  movies.forEach(m => {
    if (m.genre_id && contentMap[m.genre_id]) {
      contentMap[m.genre_id].push(m);
    }
  });

  return (
    <>
      <Hero movie={heroMovie} />
      <div className="pb-40 relative z-20 mt-4 space-y-8 md:space-y-12">
        {genres.map(genre => (
          <MovieRow 
            key={genre.id} 
            title={genre.name} 
            movies={contentMap[genre.id] || []} 
            genreId={genre.id}
          />
        ))}
      </div>
    </>
  );
}
