'use client';

import React, { useState, useEffect } from 'react';
import { getCinemaUrl, DEFAULT_CINEMA_URL } from '@/config/cinema';
import { ExternalLink, Settings2, RefreshCw } from 'lucide-react';

export function CinemaEmbed() {
  const [url, setUrl] = useState(DEFAULT_CINEMA_URL);
  const [isEditing, setIsEditing] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    const currentUrl = getCinemaUrl();
    setUrl(currentUrl);
    setInputUrl(currentUrl);
  }, []);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    let formatted = inputUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }

    localStorage.setItem('custom_cinema_url', formatted);
    setUrl(formatted);
    setIsEditing(false);
    setIframeKey((prev) => prev + 1); // Перезагружаем фрейм
  };

  const handleReset = () => {
    localStorage.removeItem('custom_cinema_url');
    setUrl(DEFAULT_CINEMA_URL);
    setInputUrl(DEFAULT_CINEMA_URL);
    setIsEditing(false);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="relative w-full h-[calc(100vh-130px)] rounded-xl overflow-hidden border border-zinc-800/60 bg-black shadow-2xl mt-2">
      {/* Верхняя тонкая плашка управления и смены зеркала */}
      <div className="absolute top-3 right-4 z-20 flex items-center gap-2 bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800/80 shadow-lg">
        <button
          onClick={() => setIframeKey((prev) => prev + 1)}
          title="Перезагрузить страницу"
          className="text-zinc-400 hover:text-white transition-colors p-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Открыть в новой вкладке"
          className="text-zinc-400 hover:text-white transition-colors p-1"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <button
          onClick={() => setIsEditing(!isEditing)}
          title="Сменить ссылку на зеркало"
          className="text-zinc-400 hover:text-white transition-colors p-1"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Модальное окно смены ссылки при блокировке домена */}
      {isEditing && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveUrl}
            className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-white font-bold text-sm">Сменить адрес кинотеатра (Зеркало)</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Если текущий сайт заблокирован, вставьте сюда рабочий адрес или новое зеркало:
            </p>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://новый-адрес.com"
              className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-red-600"
            />
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Сброс по умолчанию
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Встроенный фрейм кинотеатра */}
      <iframe
        key={iframeKey}
        src={url}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

export default CinemaEmbed;
