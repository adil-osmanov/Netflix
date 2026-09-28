"use client";

import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CollectionViewerModal from "./CollectionViewerModal";

export default function Hero({ movie }: { movie?: any }) {
  const [mounted, setMounted] = useState(false);
  const [displayMovie, setDisplayMovie] = useState(movie);
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);

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
          {displayMovie.title}
        </h1>
        
        {/* Netflix Top 10 Badge */}
        <div className="flex items-center gap-3 mb-5 drop-shadow-lg">
          <div className="bg-[#E50914] text-white font-black text-[10px] px-1.5 py-0.5 rounded-sm text-center leading-tight tracking-tighter">
            ТОП<br/>10
          </div>
          <span className="text-white font-bold text-xl drop-shadow-xl">№1 в рейтинге сегодня</span>
        </div>

        <p className="text-lg text-zinc-200 mb-10 line-clamp-3 md:line-clamp-4 max-w-2xl leading-snug drop-shadow-lg font-medium">
          {displayMovie.description || "Один из самых обсуждаемых релизов этого сезона. Погрузитесь в захватывающую историю, которая держит в напряжении от первой до последней минуты."}
        </p>

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
