"use client";

import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCollectionPartsInfoAction } from "@/app/actions";
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
    const category = searchParams.get('category') || 'movies';
    const lastWatched = localStorage.getItem(`lastWatched_${category}`);
    if (lastWatched) {
      try {
        const parsed = JSON.parse(lastWatched);
        setDisplayMovie(parsed);
      } catch (e) {
        console.error("Failed to parse lastWatched", e);
        setDisplayMovie(movie);
      }
    } else {
      setDisplayMovie(movie);
    }
    setMounted(true);
  }, [searchParams, movie]);

  const handlePlay = () => {
    if (displayMovie?.telegram_url && !displayMovie?.is_collection) {
      const category = searchParams.get('category') || 'movies';
      localStorage.setItem(`lastWatched_${category}`, JSON.stringify(displayMovie));
      
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
  let year = null;
  const yearMatch = displayTitle.match(/\b(19\d{2}|20\d{2})\b/);
  
  if (yearMatch) {
    const stripped = displayTitle.replace(/\s*[\(\[]?\b(19\d{2}|20\d{2})\b[\)\]]?\s*/, ' ').trim();
    if (stripped.length > 0) {
      year = yearMatch[0];
      displayTitle = stripped;
    }
  }

  return (
    <div 
      className="relative w-full min-h-[75vh] flex flex-col justify-end pb-16 z-10 bg-[#141414]"

      style={{
        backgroundImage: `url(${displayMovie.cover_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent" />

      <div className="relative z-20 px-10 md:px-16 max-w-3xl">
        {displayMovie.is_collection && (
          <div className="flex items-center gap-2 mb-4 drop-shadow-lg">
            <span className="text-[#E50914] font-black text-sm tracking-widest uppercase">N</span>
            <span className="text-zinc-300 text-sm tracking-[0.2em] font-medium uppercase">Коллекция</span>
          </div>
        )}

        <h1 className="text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 drop-shadow-2xl">
          {displayTitle}
        </h1>
        
        {/* Real Netflix Style Metadata Row */}
        {(year || partsInfo) && (
          <div className="flex items-center gap-3 md:gap-4 text-sm md:text-base font-semibold mb-6 drop-shadow-md">
            {year && <span className="text-zinc-300">{year}</span>}
            {partsInfo && <span className="text-zinc-300">{partsInfo}</span>}
          </div>
        )}

        {displayMovie.description && (
          <p className="text-lg text-zinc-200 mb-10 line-clamp-3 md:line-clamp-4 max-w-2xl leading-snug drop-shadow-lg">
            {displayMovie.description}
          </p>
        )}
        
        {!displayMovie.description && <div className="mb-10" />}


        <div className="flex items-center gap-4">
          <button 
            onClick={handlePlay}
            className="bg-white text-black font-bold text-lg px-8 py-3 rounded-md flex items-center gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"
          >
            <Play className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" />
            Смотреть
          </button>
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
