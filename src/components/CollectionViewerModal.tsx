"use client";

import { Play, X, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getEpisodesAction } from "@/app/actions";
import { Movie } from "./MovieCard";

interface CollectionViewerModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
}

export default function CollectionViewerModal({ movie, isOpen, onClose }: CollectionViewerModalProps) {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Series State
  const [isSeries, setIsSeries] = useState(false);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setLoading(true);
      getEpisodesAction(movie.id).then(res => {
        if (res.success && res.data) {
          let hasSeasons = false;
          const parsedData = res.data.map((ep: any) => {
            try {
              const parsed = JSON.parse(ep.title);
              if (parsed.season) hasSeasons = true;
              return { ...ep, parsedTitle: parsed.title, season: parsed.season || 1 };
            } catch (e) {
              return { ...ep, parsedTitle: ep.title, season: null };
            }
          });

          setEpisodes(parsedData);
          
          if (hasSeasons) {
            setIsSeries(true);
            const uniqueSeasons = Array.from(new Set(parsedData.map((e: any) => e.season).filter(Boolean))) as number[];
            uniqueSeasons.sort((a, b) => a - b);
            setSeasons(uniqueSeasons);
            if (uniqueSeasons.length > 0) setActiveSeason(uniqueSeasons[0]);
          } else {
            setIsSeries(false);
          }
        }
        setLoading(false);
      });
      
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, movie.id]);

  if (!isOpen || !mounted) return null;

  const playEpisode = (ep: any) => {
    let link = ep.telegram_link || movie.telegram_url;
    if (link && !link.includes('http')) {
      const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
      link = `https://t.me/c/${channelId}/${link}`;
    }
    if (link) window.open(link, '_blank');
  };

  const displayedEpisodes = isSeries 
    ? episodes.filter(e => e.season === activeSeason) 
    : episodes;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto no-scrollbar animate-in fade-in duration-300" onClick={onClose}>
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-[950px] bg-[#181818] rounded-xl shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden relative h-fit max-h-[90vh] flex flex-col my-auto animate-in fade-in zoom-in-[0.98] duration-300 ease-out"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-[#181818] rounded-full w-9 h-9 flex items-center justify-center text-white hover:bg-zinc-800 transition-colors cursor-pointer shadow-xl border border-zinc-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto no-scrollbar w-full">
          {/* Top Banner (16:9) */}
          <div className="w-full aspect-video relative flex-shrink-0">
            <img src={movie.cover_url} alt={movie.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#181818] via-[#181818]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/30 to-transparent" />
            
            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full max-w-3xl">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 drop-shadow-2xl tracking-tight leading-tight">
                {movie.title}
              </h2>
            </div>
          </div>

          {/* Content Section */}
          <div className="w-full px-8 md:px-12 pb-12 flex flex-col relative z-10 bg-[#181818]">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 font-medium py-12">Загрузка...</div>
            ) : episodes.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 font-medium py-12">Контент не найден.</div>
            ) : (
              <div className="flex-1 flex flex-col mt-4">
                
                {isSeries && seasons.length > 0 && (
                  <div className="mb-8 flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white">Эпизоды</h3>
                    <div className="relative">
                      <button 
                        onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                        className="flex items-center gap-3 bg-[#242424] hover:bg-[#2f2f2f] border border-zinc-700 hover:border-zinc-500 text-white text-lg font-semibold px-5 py-2.5 rounded-md transition-all"
                      >
                        <span>Сезон {activeSeason}</span>
                        <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isSeasonDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsSeasonDropdownOpen(false)}></div>
                          <div className="absolute right-0 top-full mt-2 w-48 bg-[#181818] border border-zinc-700 rounded-md shadow-2xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            {seasons.map(s => (
                              <button
                                key={s}
                                onClick={() => { setActiveSeason(s); setIsSeasonDropdownOpen(false); }}
                                className={`w-full text-left px-5 py-3 hover:bg-[#2f2f2f] transition-colors text-lg font-medium ${activeSeason === s ? 'text-white bg-[#2f2f2f] border-l-2 border-[#E50914]' : 'text-zinc-400 border-l-2 border-transparent'}`}
                              >
                                Сезон {s}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {!isSeries && (
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-white">Части</h3>
                  </div>
                )}

                <div className="space-y-4">
                  {displayedEpisodes.map((ep, idx) => (
                    <div 
                      key={ep.id}
                      onClick={() => playEpisode(ep)}
                      className="flex items-center gap-6 p-4 border-b border-zinc-800 group hover:bg-[#2f2f2f] transition-colors cursor-pointer rounded-lg"
                    >
                      <div className="text-2xl text-zinc-500 font-medium w-8 text-center group-hover:hidden">
                        {idx + 1}
                      </div>
                      <div className="w-8 text-center hidden group-hover:flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" fill="currentColor" />
                      </div>
                      
                      <div className="flex flex-col flex-1">
                        <span className="text-white font-bold text-lg">{ep.parsedTitle}</span>
                        <span className="text-sm text-zinc-400">
                          {isSeries ? `Серия ${idx + 1}` : `Часть ${idx + 1}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
