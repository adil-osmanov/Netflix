'use client';

import React, { useState, useEffect } from 'react';
import { STREAMING_SERVERS, StreamingServer } from '@/config/streamingServers';
import { X, ExternalLink, RefreshCw, ChevronDown } from 'lucide-react';

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
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Верхняя панель встроенного In-App браузера */}
      <div
        className="w-full h-14 bg-zinc-950 border-b border-zinc-800/80 px-4 flex items-center justify-between select-none z-20 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Левая часть: название и метаданные */}
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Назад к каталогу"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-sm text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {item.title}
            </span>
            <span className="text-zinc-500 text-xs hidden sm:inline">({item.year})</span>
            <span className="bg-zinc-800 text-zinc-300 text-[10px] font-black px-1.5 py-0.5 rounded uppercase hidden md:inline">
              {item.media_type === 'tv' ? 'Сериал' : 'Фильм'}
            </span>
          </div>
        </div>

        {/* Правая часть: селектор серверов, сезонов и кнопки управления */}
        <div className="flex items-center gap-2">
          {/* Селектор сезонов и серий для сериалов */}
          {item.media_type === 'tv' && (
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300">
              <span className="text-zinc-500 font-semibold">S</span>
              <input
                type="number"
                min={1}
                max={40}
                value={season}
                onChange={(e) => setSeason(Math.max(1, Number(e.target.value)))}
                className="w-8 bg-transparent text-center font-bold text-white focus:outline-none"
              />
              <span className="text-zinc-500 font-semibold">E</span>
              <input
                type="number"
                min={1}
                max={100}
                value={episode}
                onChange={(e) => setEpisode(Math.max(1, Number(e.target.value)))}
                className="w-8 bg-transparent text-center font-bold text-white focus:outline-none"
              />
            </div>
          )}

          {/* Быстрый выбор сервера */}
          <div className="relative group">
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

          {/* Перезагрузка плеера */}
          <button
            onClick={() => setReloadKey((prev) => prev + 1)}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Перезагрузить плеер"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Аварийное открытие во внешнем браузере */}
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

      {/* Рабочая область встроенного браузера */}
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
