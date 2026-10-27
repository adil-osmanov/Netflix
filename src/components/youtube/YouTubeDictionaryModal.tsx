"use client";

import React, { useState } from "react";
import { X, BookMarked, Volume2, Trash2, Languages, Search, Sparkles } from "lucide-react";
import { useYouTube } from "@/context/YouTubeContext";

export default function YouTubeDictionaryModal() {
  const { isDictionaryOpen, closeDictionary, savedWords, isLoadingWords, deleteWord } = useYouTube();
  const [filterSearch, setFilterSearch] = useState("");

  if (!isDictionaryOpen) return null;

  const handleSpeak = (word: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "de-DE";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const filteredWords = savedWords.filter(
    (w) =>
      w.word.toLowerCase().includes(filterSearch.toLowerCase()) ||
      w.translation.toLowerCase().includes(filterSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#181818] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <BookMarked className="w-5 h-5 text-[#E50914]" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              Немецкий словарь ({savedWords.length})
            </h3>
          </div>
          <button
            onClick={closeDictionary}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input in dictionary */}
        {savedWords.length > 3 && (
          <div className="px-5 py-2.5 bg-zinc-900/40 border-b border-zinc-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Поиск по сохраненным словам..."
              className="bg-transparent text-xs sm:text-sm text-white placeholder:text-zinc-500 outline-none w-full"
            />
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoadingWords ? (
            <div className="py-12 text-center text-zinc-500">Загружаем сохраненные слова...</div>
          ) : savedWords.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 flex flex-col items-center gap-2">
              <Languages className="w-10 h-10 text-zinc-700" />
              <p className="text-base text-zinc-300 font-medium">У вас пока нет сохраненных слов</p>
              <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                Во время просмотра наводите курсор на слова в субтитрах или кликайте по ним, чтобы моментально переводить и сохранять во флешкарты.
              </p>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-sm">
              Слов по запросу «{filterSearch}» не найдено
            </div>
          ) : (
            filteredWords.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start justify-between gap-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {item.word}
                    </span>
                    <button
                      onClick={() => handleSpeak(item.word)}
                      title="Озвучить на немецком"
                      className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-zinc-300 mb-2">
                    {item.translation}
                  </p>
                  {item.context_sentence && (
                    <p className="text-xs text-zinc-400 italic bg-black/40 p-2 rounded-lg border border-zinc-800/80 leading-relaxed">
                      &ldquo;{item.context_sentence}&rdquo;
                    </p>
                  )}
                </div>

                <button
                  onClick={() => deleteWord(item.word)}
                  title="Удалить из словаря"
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
