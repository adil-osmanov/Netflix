'use client';

import React, { useState, useEffect } from 'react';
import { STREAMING_SERVERS, StreamingServer } from '@/config/streamingServers';
import { X, RefreshCw, ExternalLink, ChevronDown } from 'lucide-react';

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
  const [activeServer, setActiveServer] = useState<StreamingServer>(STREAMING_SERVERS[0]);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // Запрещаем скролл фона при открытии плеера
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

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
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-200 overscroll-contain"
      onClick={onClose}
    >
      {/* Верхняя навигационная панель */}
      <div
        className="w-full h-14 bg-zinc-950/90 border-b border-zinc-800/80 px-4 flex items-center justify-between select-none z-20 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Назад к каталогу"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-sm text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {item.title}
            </span>
            <span className="text-zinc-500 text-xs hidden sm:inline">({item.year})</span>
          </div>
        </div>

        {/* Управление: Сезоны, Серии, Серверы */}
        <div className="flex items-center gap-2">
          {/* Премиальный выбор сезона и серии */}
          {item.media_type === 'tv' && (
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              <div className="relative">
                <select
                  value={season}
                  onChange={(e) => {
                    setSeason(Number(e.target.value));
                    setEpisode(1); // сброс серии при смене сезона
                  }}
                  className="appearance-none bg-black/50 text-white text-xs font-semibold px-2.5 py-1 pr-6 rounded border border-zinc-800 hover:border-zinc-700 cursor-pointer focus:outline-none"
                >
                  {Array.from({ length: 25 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s} className="bg-zinc-900 text-white">
                      Сезон {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-1.5 top-2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={episode}
                  onChange={(e) => setEpisode(Number(e.target.value))}
                  className="appearance-none bg-black/50 text-white text-xs font-semibold px-2.5 py-1 pr-6 rounded border border-zinc-800 hover:border-zinc-700 cursor-pointer focus:outline-none"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((e) => (
                    <option key={e} value={e} className="bg-zinc-900 text-white">
                      Серия {e}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-1.5 top-2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Селектор сервера */}
          <div className="relative">
            <select
              value={activeServer.id}
              onChange={(e) => {
                const found = STREAMING_SERVERS.find((s) => s.id === e.target.value);
                if (found) setActiveServer(found);
              }}
              className="appearance-none bg-zinc-900 hover:bg-zinc-850 text-white text-xs font-semibold px-3 py-1.5 pr-7 rounded-lg border border-zinc-700/80 cursor-pointer focus:outline-none"
            >
              {STREAMING_SERVERS.map((server) => (
                <option key={server.id} value={server.id} className="bg-zinc-900 text-white">
                  {server.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Обновить плеер */}
          <button
            onClick={() => setReloadKey((prev) => prev + 1)}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Перезагрузить поток"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Открыть оригинал во внешнем браузере при необходимости */}
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Открыть в новой вкладке"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Сам полноэкранный плеер */}
      <div
        className="relative flex-1 w-full h-full bg-black flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          key={`${reloadKey}-${activeServer.id}-${item.id}-${season}-${episode}`}
          src={embedUrl}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default MovieModal;
