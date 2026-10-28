"use client";

import React, { useState } from "react";
import { 
  X, 
  Volume2, 
  Trash2, 
  Languages, 
  Search, 
  Download, 
  AlertTriangle
} from "lucide-react";
import { useYouTube } from "@/context/YouTubeContext";

export default function VocabularyModal() {
  const { 
    isDictionaryOpen, 
    closeDictionary, 
    savedWords, 
    isLoadingWords, 
    deleteWord, 
    clearChannelDeck 
  } = useYouTube();

  const [activeDeck, setActiveDeck] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  if (!isDictionaryOpen) return null;

  // Group words into channels / decks
  const decksMap: Record<string, number> = { all: savedWords.length };
  savedWords.forEach((item) => {
    const ch = item.channel_title || "Общее";
    decksMap[ch] = (decksMap[ch] || 0) + 1;
  });

  const deckKeys = Object.keys(decksMap);

  // Filter words by deck and search
  const filteredWords = savedWords.filter((w) => {
    const matchesDeck = activeDeck === "all" || (w.channel_title || "Общее") === activeDeck;
    const matchesSearch =
      w.word.toLowerCase().includes(filterSearch.toLowerCase()) ||
      w.translation.toLowerCase().includes(filterSearch.toLowerCase()) ||
      (w.lemma && w.lemma.toLowerCase().includes(filterSearch.toLowerCase())) ||
      (w.video_title && w.video_title.toLowerCase().includes(filterSearch.toLowerCase()));
    return matchesDeck && matchesSearch;
  });

  const handleSpeak = (word: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "de-DE";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  // Export Channel Deck to JSON
  const handleExportChannelJSON = () => {
    const exportData = filteredWords.map((item) => ({
      word: item.word,
      lemma: item.lemma || item.word,
      translation: item.translation,
      context_sentence: item.sentence || item.context_sentence || "",
      channel: item.channel_title || "Общее",
      video_title: item.video_title || "",
      video_id: item.video_id || "",
      date_added: item.created_at,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deck_${activeDeck.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear Channel Deck
  const handleClearDeck = async () => {
    await clearChannelDeck(activeDeck);
    setShowClearConfirm(false);
  };

  // Helper to render word with colored article
  const renderWordWithArticle = (word: string, lemma?: string) => {
    const textToCheck = (lemma || word).trim();
    const match = textToCheck.match(/^(der|die|das)\s+(.*)$/i);
    if (match) {
      const article = match[1].toLowerCase();
      const clean = match[2];
      const colorClass =
        article === "der"
          ? "text-blue-400 font-bold"
          : article === "die"
          ? "text-red-500 font-bold"
          : "text-emerald-400 font-bold";
      return (
        <span className="flex items-center gap-1.5 font-semibold text-sm sm:text-base">
          <span className={colorClass}>{article}</span>
          <span className="text-white">{clean}</span>
        </span>
      );
    }
    return <span className="font-semibold text-white text-sm sm:text-base">{word}</span>;
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="max-w-2xl w-full bg-zinc-950/95 border border-zinc-800/80 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Мой словарь
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E50914] text-white">
              {savedWords.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {filteredWords.length > 0 && (
              <>
                <button
                  onClick={handleExportChannelJSON}
                  title="Экспорт колоды (.json)"
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <Download size={14} className="text-amber-400" />
                  <span className="hidden sm:inline">Экспорт колоды (.json)</span>
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  title="Очистить"
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Очистить</span>
                </button>
              </>
            )}

            <button
              onClick={closeDictionary}
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Channel Tabs (Horizontal Scroll) */}
        {savedWords.length > 0 && (
          <div className="py-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-zinc-800/60">
            {deckKeys.map((deck) => {
              const isActive = activeDeck === deck;
              const count = decksMap[deck];
              const label = deck === "all" ? "Все" : deck;
              return (
                <button
                  key={deck}
                  onClick={() => setActiveDeck(deck)}
                  className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-white text-black font-semibold shadow"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? "bg-black/15 text-black" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search Input */}
        {savedWords.length > 3 && (
          <div className="py-2.5 flex items-center gap-2 text-zinc-400 border-b border-zinc-900">
            <Search size={14} className="text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Поиск по словам или переводу..."
              className="bg-transparent text-xs text-white placeholder:text-zinc-600 outline-none w-full"
            />
            {filterSearch && (
              <button onClick={() => setFilterSearch("")} className="text-zinc-500 hover:text-white cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Word Cards List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 no-scrollbar">
          {isLoadingWords ? (
            <div className="py-16 text-center text-zinc-500 text-xs">Загрузка слов...</div>
          ) : savedWords.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 flex flex-col items-center gap-2">
              <Languages className="w-10 h-10 text-zinc-700" />
              <p className="text-sm text-zinc-300 font-medium">Словарь пока пуст</p>
              <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                Наводите на слова во время просмотра видео, чтобы видеть перевод, и кликайте на них для сохранения.
              </p>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Слов по запросу «{filterSearch}» не найдено
            </div>
          ) : (
            filteredWords.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/60 transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {renderWordWithArticle(item.word, item.lemma)}
                    <button
                      onClick={() => handleSpeak(item.word)}
                      title="Озвучить"
                      className="p-1 text-zinc-500 hover:text-zinc-200 transition cursor-pointer"
                    >
                      <Volume2 size={13} />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-zinc-300 mt-0.5 capitalize">
                    {item.translation}
                  </p>
                  {(item.sentence || item.context_sentence) && (
                    <p className="text-xs text-zinc-500 italic line-clamp-1 mt-1">
                      {item.sentence || item.context_sentence}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => deleteWord(item.word)}
                  title="Удалить слово"
                  className="p-1.5 text-zinc-600 hover:text-red-400 transition cursor-pointer flex-shrink-0"
                >
                  <Trash2 size={14} className="text-zinc-600 hover:text-red-400 transition" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Clear Channel Deck Confirmation Modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-sm flex flex-col gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">
                Очистить колоду «{activeDeck === "all" ? "Все каналы" : activeDeck}»?
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Вы уверены? Будут удалены все сохраненные слова ({filteredWords.length} шт.) из базы данных.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleClearDeck}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-900/30 cursor-pointer"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
