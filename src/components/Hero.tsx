"use client";

import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCollectionPartsInfoAction, getLastWatchedAction, setLastWatchedAction } from "@/app/actions";
import CollectionViewerModal from "./CollectionViewerModal";

export default function Hero({ movie }: { movie?: any }) {
  const [mounted, setMounted] = useState(false);
  const [displayMovie, setDisplayMovie] = useState(movie);
  const searchParams = useSearchParams();

  const [modalOpen, setModalOpen] = useState(false);
  const [partsInfo, setPartsInfo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPartsInfo() {
      if (!displayMovie?.is_collection) {
        setPartsInfo(null);
        return;
      }
      
      const info = await getCollectionPartsInfoAction(displayMovie.id, displayMovie.collection_type);
      setPartsInfo(info);
    }
    if (displayMovie) {
      fetchPartsInfo();
    }
  }, [displayMovie]);


  useEffect(() => {
    const category = searchParams.get('category') || 'all';
    
    async function loadLastWatched() {
      const dbWatched = await getLastWatchedAction(category);
      if (dbWatched) {
        setDisplayMovie(dbWatched);
      } else {
        setDisplayMovie(movie);
      }
      setMounted(true);
    }
    
    loadLastWatched();
  }, [searchParams, movie]);


  const getPlayLink = () => {
    if (displayMovie?.is_collection) return null;
    let url = displayMovie?.telegram_url;
    if (url && !url.includes('http')) {
      const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
      url = `https://t.me/c/${channelId}/${url}`;
    }
    return url || '#';
  };
  const handlePlay = () => {
    if (displayMovie?.telegram_url && !displayMovie?.is_collection) {
      const category = searchParams.get('category') || 'all';
      setLastWatchedAction(category, displayMovie);
      
      let url = displayMovie.telegram_url;
      if (url && !url.includes('http')) {
        const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
        url = `https://t.me/c/${channelId}/${url}`;
      }
      window.open(url, '_blank');
    } else if (displayMovie?.is_collection) {
      setModalOpen(true);
    }
  };


  if (!mounted || !displayMovie) return <div className="min-h-[75vh] w-full bg-[#141414] animate-pulse"></div>;

  let displayTitle = displayMovie.title;
  let year = displayMovie.release_year;

  return (
    <div 
      className="relative w-full aspect-[16/9] md:aspect-auto md:h-[75vh] md:max-h-[850px] flex flex-col justify-end pb-4 md:pb-16 z-10 bg-[#141414] bg-top bg-no-repeat bg-contain md:bg-cover"
      style={{ backgroundImage: `url(${displayMovie.cover_url})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 md:from-[#141414] md:via-[#141414]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 md:via-[#141414]/20 to-transparent" />

      <div className="relative z-20 px-4 md:px-12 lg:px-16 max-w-3xl">
        {displayMovie.is_collection && (
          <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-4 drop-shadow-lg">
            <span className="text-[#E50914] font-black text-xs md:text-sm tracking-widest uppercase">N</span>
            <span className="text-zinc-300 text-xs md:text-sm tracking-[0.2em] font-medium uppercase">Коллекция</span>
          </div>
        )}

        <h1 className="text-2xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-1 md:mb-6 drop-shadow-2xl">
          {displayTitle}
        </h1>
        
        {/* Real Netflix Style Metadata Row */}
        {(year || partsInfo || displayMovie.has_subtitles) && (
          <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-base font-semibold mb-3 md:mb-6 drop-shadow-md">
            {year && <span className="text-zinc-300">{year}</span>}
            {partsInfo && <span className="text-zinc-300">{partsInfo}</span>}
            {displayMovie.has_subtitles && (
              <span className="px-1.5 py-0.5 border border-zinc-400 text-zinc-300 text-[9px] md:text-xs rounded-[3px] font-bold tracking-wider leading-none shadow-sm flex items-center justify-center">
                CC
              </span>
            )}
          </div>
        )}

        {displayMovie.description && (
          <p className="hidden md:block text-sm md:text-lg text-zinc-200 mb-6 md:mb-10 line-clamp-3 md:line-clamp-4 max-w-2xl leading-snug drop-shadow-lg">
            {displayMovie.description}
          </p>
        )}
        
        {!displayMovie.description && <div className="mb-2 md:mb-10" />}


        <div className="flex items-center gap-4">
          {displayMovie.is_collection ? (
            <button 
              onClick={() => setModalOpen(true)}
              className="bg-white text-black font-bold text-xs md:text-lg px-3 md:px-8 py-1.5 md:py-3 rounded-md flex items-center gap-1.5 md:gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"
            >
              <Play className="w-4 h-4 md:w-7 md:h-7" fill="currentColor" />
              Смотреть
            </button>
          ) : (
            <a 
              href={getPlayLink()!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                const category = searchParams.get('category') || 'all';
                setLastWatchedAction(category, displayMovie);
              }}
              className="bg-white text-black font-bold text-xs md:text-lg px-3 md:px-8 py-1.5 md:py-3 rounded-md flex items-center gap-1.5 md:gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"
            >
              <Play className="w-4 h-4 md:w-7 md:h-7" fill="currentColor" />
              Смотреть
            </a>
          )}
        </div>
      </div>

      <CollectionViewerModal 
        movie={displayMovie} 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />
    </div>
  );
}
