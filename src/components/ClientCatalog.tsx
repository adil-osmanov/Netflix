"use client";

import { useSearch } from "./SearchContext";
import MovieRow from "./MovieRow";
import MovieCard, { Movie } from "./MovieCard";
import Hero from "./Hero";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import AddContentModal from "./AddContentModal";

interface ClientCatalogProps {
  allGenres: any[];
  allMovies: Movie[];
  allCategories: any[];
}

export default function ClientCatalog({ allGenres, allMovies, allCategories }: ClientCatalogProps) {
  const { searchTerm } = useSearch();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [hideAddButtons, setHideAddButtons] = useState(false);

  useEffect(() => {
    const checkSettings = () => setHideAddButtons(localStorage.getItem('netflix_hide_add_buttons') === 'true');
    checkSettings();
    window.addEventListener('storage', checkSettings);
    return () => window.removeEventListener('storage', checkSettings);
  }, []);

  const genreFilter = searchParams.get('genre');
  const genreName = searchParams.get('genreName');
  const categoryParam = searchParams.get('category') || 'all';

  // SEARCH VIEW
  if (searchTerm.trim()) {
    const lowerQuery = searchTerm.toLowerCase();
    const filteredMovies = allMovies.filter(m => 
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

  // Derive current view data
  const categoryMap: Record<string, string> = {
    movies: 'Фильмы',
    series: 'Сериалы',
    cartoons: 'Мультфильмы',
    all: 'Главная'
  };
  const categoryName = categoryMap[categoryParam] || 'Главная';
  const currentCategory = allCategories.find(c => c.name === categoryName);

  let displayGenres: any[] = [];
  let displayMovies: Movie[] = [];
  
  if (categoryParam === 'all') {
    displayGenres = []; // Flat grid for Home
    displayMovies = allMovies;
  } else if (currentCategory) {
    displayGenres = allGenres.filter(g => g.category_id === currentCategory.id);
    const validGenreIds = new Set(displayGenres.map(g => g.id));
    displayMovies = allMovies.filter(m => m.genre_id && validGenreIds.has(m.genre_id));
  }

  const heroMovie = displayMovies.length > 0 ? displayMovies[0] : undefined;

  // GENRE DETAIL VIEW
  if (genreFilter) {
    const moviesForGenre = displayMovies.filter(m => m.genre_id === genreFilter);
    return (
      <div className="pt-28 px-4 md:px-12 w-full z-10 relative">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Жанр: {genreName || 'Все'}</h1>
          </div>
          
          {!hideAddButtons && (
            <button 
              onClick={() => setAddModalOpen(true)}
              className="bg-[#E50914] text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition-colors flex items-center gap-2 w-fit"
            >
              <Plus className="w-5 h-5" />
              Добавить контент
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-x-2 gap-y-4 md:gap-y-8 pb-40">
          {moviesForGenre.map(movie => (
            <div key={movie.id} className="w-full">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>

        <AddContentModal 
          isOpen={addModalOpen} 
          onClose={() => setAddModalOpen(false)} 
          genreId={genreFilter}
        />
      </div>
    );
  }

  // STANDARD CATEGORY OR HOME VIEW
  if (categoryParam === 'all') {
    return (
      <div className="pt-28 px-4 md:px-12 w-full z-10 relative pb-40">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-x-2 gap-y-2 md:gap-y-8">
          {displayMovies.map((movie) => (
            <div key={movie.id} className="w-full">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Hero movie={heroMovie} />
      <div className="pb-40 relative z-20 mt-2 md:mt-4 space-y-4 md:space-y-12">
        {displayGenres.map(genre => (
          <MovieRow 
            key={genre.id} 
            title={genre.name}
            genreId={genre.id}
            movies={displayMovies.filter(m => m.genre_id === genre.id)} 
          />
        ))}
      </div>
    </>
  );
}
