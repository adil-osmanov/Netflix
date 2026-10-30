"use client";

import { Play, X, ChevronDown, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useWatched } from "@/context/WatchedContext";
import { openTelegramLink } from "@/lib/telegram";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { getEpisodesAction, setLastWatchedAction } from "@/app/actions";
import { Movie } from "./MovieCard";

interface CollectionViewerModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
}

export default function CollectionViewerModal({ movie, isOpen, onClose }: CollectionViewerModalProps) {
  const { isWatched, toggleWatched } = useWatched();
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
    let active = true;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setLoading(true);

      const fetchEpisodes = async () => {
        try {
          let resData: any[] | null = null;

          // 1. Try fast and reliable direct API route
          try {
            const apiRes = await fetch(`/api/episodes?contentId=${encodeURIComponent(movie.id)}`);
            if (apiRes.ok) {
              const json = await apiRes.json();
              if (json?.success && Array.isArray(json.data)) {
                resData = json.data;
              }
            }
          } catch (e) {
            console.warn("API route /api/episodes failed, attempting server action", e);
          }

          // 2. Fallback to server action
          if (!resData) {
            const actionRes = await getEpisodesAction(movie.id);
            if (actionRes?.success && Array.isArray(actionRes.data)) {
              resData = actionRes.data;
            }
          }

          if (!active) return;

          if (resData && resData.length > 0) {
            let hasSeasons = false;
            const parsedData = resData.map((ep: any) => {
              try {
                const parsed = JSON.parse(ep.title);
                if (parsed.season) hasSeasons = true;
                return { ...ep, parsedTitle: parsed.title, season: parsed.season || 1 };
              } catch (e) {
                return { ...ep, parsedTitle: ep.title, season: null };
              }
            });

            setEpisodes(parsedData);
            
            const isActuallySeries = movie.collection_type === 'series';
            if (isActuallySeries) {
              setIsSeries(true);
              const uniqueSeasons = Array.from(new Set(parsedData.map((e: any) => e.season).filter(Boolean))) as number[];
              uniqueSeasons.sort((a, b) => a - b);
              setSeasons(uniqueSeasons);
              if (uniqueSeasons.length > 0) setActiveSeason(uniqueSeasons[0]);
            } else {
              setIsSeries(false);
            }
          } else {
            setEpisodes([]);
          }
        } catch (err) {
          console.error("Failed to load episodes:", err);
          if (active) setEpisodes([]);
        } finally {
          if (active) setLoading(false);
        }
      };

      fetchEpisodes();
      
      return () => {
        active = false;
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, movie.id, movie.collection_type]);

  const displayedEpisodes = useMemo(() => {
    return isSeries 
      ? episodes.filter(e => e.season === activeSeason) 
      : episodes;
  }, [isSeries, episodes, activeSeason]);

  const seasonWatchedCount = useMemo(() => {
    return displayedEpisodes.filter(ep => isWatched(movie.id, ep.id)).length;
  }, [displayedEpisodes, isWatched, movie.id]);

  if (!isOpen || !mounted) return null;

  const getDisplayName = (title: string, idx: number) => {
    const s = `Серия ${idx + 1}`;
    const p = `Часть ${idx + 1}`;
    if (title === s) return "Серия";
    if (title === p) return "Часть";
    return title;
  };

  const playEpisode = (ep: any) => {
    const raw = ep.telegram_link || movie.telegram_url;
    if (raw) openTelegramLink(raw);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto no-scrollbar animate-in fade-in duration-300" onClick={onClose}>
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-[950px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden relative h-fit max-h-[90vh] flex flex-col my-auto animate-in fade-in zoom-in-[0.98] duration-300 ease-out"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-zinc-900 rounded-full w-9 h-9 flex items-center justify-center text-white hover:bg-zinc-800 transition-colors cursor-pointer shadow-xl border border-zinc-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto no-scrollbar w-full">
          {/* Top Banner (16:9) */}
          <div className="w-full aspect-video relative flex-shrink-0">
            <Image src={movie.cover_url} alt={movie.title} fill sizes="(max-width: 1024px) 100vw, 950px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
            
            <div className="absolute bottom-0 left-0 p-4 md:p-12 w-full max-w-3xl">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 drop-shadow-2xl tracking-tight leading-tight">
                {movie.title}
              </h2>
            </div>
          </div>

          {/* Content Section */}
          <div className="w-full px-4 md:px-12 pb-8 md:pb-12 flex flex-col relative z-10 bg-zinc-950">
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
                        className="flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white text-lg font-semibold px-5 py-2.5 rounded-md transition-all cursor-pointer"
                      >
                        <span>Сезон {activeSeason}</span>
                        <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isSeasonDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsSeasonDropdownOpen(false)}></div>
                          <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-md shadow-2xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            {seasons.map(s => (
                              <button
                                key={s}
                                onClick={() => { setActiveSeason(s); setIsSeasonDropdownOpen(false); }}
                                className={`w-full text-left px-5 py-3 hover:bg-zinc-800 transition-colors text-lg font-medium cursor-pointer ${activeSeason === s ? 'text-white bg-zinc-800 border-l-2 border-[#E50914]' : 'text-zinc-400 border-l-2 border-transparent'}`}
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
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const isSeriesItem = movie.collection_type === 'series' || movie.category?.toLowerCase()?.includes('сериал');
                        const isCartoonItem = movie.category?.toLowerCase()?.includes('мульт');
                        const targetCat = isSeriesItem ? 'series' : (isCartoonItem ? 'cartoons' : 'movies');
                        setLastWatchedAction(targetCat, movie);
                        setLastWatchedAction('all', movie);
                        playEpisode(ep);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          const isSeriesItem = movie.collection_type === 'series' || movie.category?.toLowerCase()?.includes('сериал');
                          const isCartoonItem = movie.category?.toLowerCase()?.includes('мульт');
                          const targetCat = isSeriesItem ? 'series' : (isCartoonItem ? 'cartoons' : 'movies');
                          setLastWatchedAction(targetCat, movie);
                          setLastWatchedAction('all', movie);
                          playEpisode(ep);
                        }
                      }}
                      className="flex items-center gap-6 p-4 border-b border-zinc-800/80 group hover:bg-zinc-900/80 transition-colors cursor-pointer rounded-lg select-none outline-none"
                    >
                      <div className="text-2xl text-zinc-500 font-medium w-8 text-center group-hover:hidden">
                        {idx + 1}
                      </div>
                      <div className="w-8 text-center hidden group-hover:flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" fill="currentColor" />
                      </div>
                      
                      <div className="flex flex-col flex-1">
                        <span className="text-white font-bold text-lg">{getDisplayName(ep.parsedTitle, idx)}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatched(movie.id, ep.id); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer select-none outline-none"
                        title={isWatched(movie.id, ep.id) ? "Отметить как непросмотренное" : "Отметить как просмотренное"}
                      >
                        <CheckCircle2 className={`w-6 h-6 ${isWatched(movie.id, ep.id) ? 'text-green-500' : 'text-zinc-600'}`} />
                      </button>
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
