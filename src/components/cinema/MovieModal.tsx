'use client';

import React, { useState, useEffect } from 'react';
import { EMBED_SERVERS } from '@/config/movieEmbeds';
import { X, Star, Calendar, Server, Film, Tv } from 'lucide-react';

export interface CinemaItem {
  id: number | string;
  title: string;
  original_title?: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  year: string;
  vote_average: string;
  media_type: 'movie' | 'tv';
}

interface MovieModalProps {
  item: CinemaItem;
  onClose: () => void;
}

export function MovieModal({ item, onClose }: MovieModalProps) {
  const [activeServer, setActiveServer] = useState(EMBED_SERVERS[0]);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [isPlayerActive, setIsPlayerActive] = useState(false);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const embedUrl =
    item.media_type === 'tv'
      ? activeServer.getTvUrl(item.id, season, episode)
      : activeServer.getMovieUrl(item.id);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/70 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer select-none outline-none"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Видеоплеер или постер-превью */}
        <div className="relative aspect-video w-full bg-black overflow-hidden border-b border-zinc-800/80">
          {isPlayerActive ? (
            <iframe
              key={`${activeServer.id}-${item.id}-${season}-${episode}`}
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="relative w-full h-full">
              <img
                src={item.backdrop || item.poster || ''}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <button
                  onClick={() => setIsPlayerActive(true)}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide shadow-2xl transition-transform hover:scale-105 cursor-pointer outline-none"
                >
                  <Film className="w-4 h-4 fill-current" />
                  <span>Смотреть в приложении</span>
                </button>
              </div>

              <div className="absolute bottom-4 left-6 right-16">
                <h2 className="text-xl sm:text-2xl font-black text-white line-clamp-1">{item.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-300 font-semibold flex-wrap">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-current" /> {item.vote_average}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {item.year}
                  </span>
                  <span>•</span>
                  <span className="bg-blue-600/90 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                    {item.media_type === 'tv' ? 'Сериал' : 'Фильм'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Панель выбора серверов и сезонов */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Переключатель серверов */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
              <Server className="w-3.5 h-3.5" />
              <span>Сервер трансляции (переключите, если не грузит):</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EMBED_SERVERS.map((server) => {
                const isSelected = activeServer.id === server.id;
                return (
                  <button
                    key={server.id}
                    onClick={() => {
                      setActiveServer(server);
                      setIsPlayerActive(true);
                    }}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800 border-red-600 text-white shadow-md'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850'
                    }`}
                  >
                    <span className="text-xs font-bold">{server.name}</span>
                    <span className="text-[10px] text-zinc-500">{server.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Селектор сезона и серии (если сериал) */}
          {item.media_type === 'tv' && (
            <div className="flex items-center gap-4 bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <Tv className="w-4 h-4 text-red-500" />
                <span>Сезон:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={season}
                  onChange={(e) => setSeason(Math.max(1, Number(e.target.value)))}
                  className="w-14 px-2 py-1 bg-black border border-zinc-700 rounded text-center text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <span>Серия:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={episode}
                  onChange={(e) => setEpisode(Math.max(1, Number(e.target.value)))}
                  className="w-14 px-2 py-1 bg-black border border-zinc-700 rounded text-center text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>
            </div>
          )}

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            {item.overview || 'Описание фильма временно отсутствует.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default MovieModal;
