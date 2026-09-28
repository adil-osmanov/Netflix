"use client";

import MovieCard, { Movie } from "./MovieCard";
import { Plus, ChevronLeft, ChevronRight, ChevronRightCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import AddContentModal from "./AddContentModal";
import { updateContentGenreAction } from "@/app/actions";
import { useRouter } from "next/navigation";

interface MovieRowProps {
  title: string;
  movies: Movie[];
  genreId?: string;
}

export default function MovieRow({ title, movies, genreId }: MovieRowProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [hideAddButtons, setHideAddButtons] = useState(false);

  useEffect(() => {
    const checkSettings = () => setHideAddButtons(localStorage.getItem('netflix_hide_add_buttons') === 'true');
    checkSettings();
    window.addEventListener('storage', checkSettings);
    return () => window.removeEventListener('storage', checkSettings);
  }, []);
  
  const rowRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    handleScroll();
  }, [movies.length]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (genreId) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!genreId) return;

    const movieId = e.dataTransfer.getData('movieId');
    if (movieId) {
      const result = await updateContentGenreAction(movieId, genreId);
      if (result.success) {
        window.location.reload();
      }
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  const openGenre = () => {
    if (genreId) {
      router.push(`?genre=${genreId}&genreName=${encodeURIComponent(title)}`);
    }
  };

  return (
    <>
      <div 
        className="px-4 md:px-12 relative transition-all duration-300 rounded-lg group/row"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`mb-2 p-2 -m-2 rounded-lg transition-colors duration-300 ${isDragOver ? 'bg-zinc-800/50 ring-2 ring-zinc-500 shadow-2xl' : 'bg-transparent'}`}>
          <div 
            onClick={openGenre}
            className="relative z-30 flex items-center gap-2 cursor-pointer group/title inline-flex mb-1 md:mb-2 ml-2"
          >
            <p className="text-[#e5e5e5] text-[1.2vw] md:text-xl font-bold tracking-wide group-hover/title:text-white transition-colors">
              {title}
            </p>
            <ChevronRight className="w-5 h-5 text-[#e5e5e5] opacity-0 -translate-x-2 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all duration-300" />
            <span className="text-[#54b9c5] text-xs font-bold opacity-0 -translate-x-2 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all duration-300">
              Посмотреть всё
            </span>
          </div>
          
          <div className="relative group/carousel">
            {/* Left Scroll Arrow - Always partially visible on Netflix when scrolling is possible */}
            <div 
              className={`absolute top-12 bottom-12 left-0 z-[70] w-12 md:w-16 lg:w-[4vw] bg-black/50 flex items-center justify-center cursor-pointer transition-all duration-300 -ml-4 md:-ml-12 ${showLeftArrow ? (isHovered ? 'opacity-100 bg-black/70 hover:w-[5vw]' : 'opacity-0') : 'opacity-0 pointer-events-none'}`}
              onClick={(e) => { e.stopPropagation(); scroll('left'); }}
            >
              <ChevronLeft className="w-8 h-8 md:w-10 md:h-10 text-white transition-transform duration-300 group-hover/carousel:scale-125" />
            </div>

            {/* Horizontal Scroll / Carousel Container */}
            <div 
              ref={rowRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto overflow-y-hidden gap-2 py-12 -my-12 scroll-smooth snap-x relative -mx-4 px-4 md:-mx-12 md:px-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {/* Movie Cards (No z-10 wrapper so MovieCard can establish its own z-index!) */}
              {movies.map((movie) => (
                <div key={movie.id} className="w-[45vw] sm:w-[30vw] md:w-[23vw] lg:w-[calc((100vw-8rem)/5)] flex-shrink-0 snap-center">
                  <MovieCard movie={movie} />
                </div>
              ))}

              {/* Inline Add Button */}
              {genreId && !hideAddButtons && (
                <div 
                  onClick={(e) => { e.stopPropagation(); setAddModalOpen(true); }}
                  className="w-[45vw] sm:w-[30vw] md:w-[23vw] lg:w-[calc((100vw-8rem)/5)] aspect-video flex-shrink-0 flex flex-col items-center justify-center border border-zinc-700/50 bg-[#141414] text-zinc-500 hover:text-white hover:border-white hover:bg-zinc-800/50 cursor-pointer transition-all duration-300 rounded-md snap-center group shadow-md"
                >
                  <Plus className="w-8 h-8 md:w-10 md:h-10 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-xs md:text-sm text-center px-2 tracking-wide">Добавить в {title.toLowerCase()}</span>
                </div>
              )}
            </div>

            {/* Right Scroll Arrow */}
            <div 
              className={`absolute top-12 bottom-12 right-0 z-[70] w-12 md:w-16 lg:w-[4vw] bg-black/50 flex items-center justify-center cursor-pointer transition-all duration-300 -mr-4 md:-mr-12 ${showRightArrow ? (isHovered ? 'opacity-100 bg-black/70 hover:w-[5vw]' : 'opacity-0') : 'opacity-0 pointer-events-none'}`}
              onClick={(e) => { e.stopPropagation(); scroll('right'); }}
            >
              <ChevronRight className="w-8 h-8 md:w-10 md:h-10 text-white transition-transform duration-300 group-hover/carousel:scale-125" />
            </div>
          </div>
        </div>
      </div>

      {genreId && (
        <AddContentModal 
          genreId={genreId} 
          isOpen={addModalOpen} 
          onClose={() => setAddModalOpen(false)} 
        />
      )}
    </>
  );
}
