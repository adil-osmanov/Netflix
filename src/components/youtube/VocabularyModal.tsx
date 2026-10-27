"use client";

import React, { useState } from "react";
import { 
  X, 
  BookMarked, 
  Volume2, 
  Trash2, 
  Languages, 
  Search, 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  AlertTriangle,
  Sparkles 
} from "lucide-react";
import { useYouTube } from "@/context/YouTubeContext";
import { clearChannelDeckAction } from "@/app/youtube/actions";

export default function VocabularyModal() {
  const { isDictionaryOpen, closeDictionary, savedWords, isLoadingWords, deleteWord, refreshSavedWords } = useYouTube();

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
      (w.lemma && w.lemma.toLowerCase().includes(filterSearch.toLowerCase()));
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

  // Export deck to JSON
  const handleExportJSON = () => {
    const exportData = filteredWords.map((item) => ({
      word: item.word,
      lemma: item.lemma || item.word,
      translation: item.translation,
      context_sentence: item.sentence || item.context_sentence || "",
      channel: item.channel_title || "Общее",
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

  // Export deck to CSV for Anki / Quizlet
  const handleExportCSV = () => {
    const header = "Word;Lemma;Translation;Context Sentence;Channel\n";
    const rows = filteredWords
      .map((item) => {
        const w = item.word.replace(/;/g, ",");
        const l = (item.lemma || item.word).replace(/;/g, ",");
        const t = item.translation.replace(/;/g, ",");
        const s = (item.sentence || item.context_sentence || "").replace(/;/g, ",").replace(/\n/g, " ");
        const ch = (item.channel_title || "Общее").replace(/;/g, ",");
        return `"${w}";"${l}";"${t}";"${s}";"${ch}"`;
      })
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deck_${activeDeck.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear deck action
  const handleClearDeck = async () => {
    await clearChannelDeckAction(activeDeck);
    setShowClearConfirm(false);
    refreshSavedWords();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#181818] border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/70">
          <div className="flex items-center gap-2.5">
            <BookMarked className="w-5 h-5 text-[#E50914]" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Мой немецкий словарь ({savedWords.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Dropdown / Actions */}
            {filteredWords.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportJSON}
                  title="Экспорт в JSON для LLM / ChatGPT"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
                >
                  <FileJson className="w-3.5 h-3.5 text-amber-400" />
                  <span>.JSON</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  title="Экспорт в CSV для Anki"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>.CSV</span>
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  title="Очистить колоду канала"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Очистить колоду</span>
                </button>
              </div>
            )}

            <button
              onClick={closeDictionary}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Deck Channel Tabs: Dynamically generated from unique channels */}
        {savedWords.length > 0 && (
          <div className="px-5 py-2.5 bg-zinc-900/40 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {deckKeys.map((deck) => (
              <button
                key={deck}
                onClick={() => setActiveDeck(deck)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeDeck === deck
                    ? "bg-white text-black shadow-md scale-105"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                <span>{deck === "all" ? "Все слова" : deck}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    activeDeck === deck
                      ? "bg-black text-white"
                      : "bg-zinc-900 text-zinc-400"
                  }`}
                >
                  {decksMap[deck]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Search Input */}
        {savedWords.length > 2 && (
          <div className="px-5 py-2.5 bg-zinc-900/30 border-b border-zinc-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Поиск по словам, переводу или начальной форме..."
              className="bg-transparent text-xs sm:text-sm text-white placeholder:text-zinc-500 outline-none w-full"
            />
            {filterSearch && (
              <button onClick={() => setFilterSearch("")} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Word Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoadingWords ? (
            <div className="py-16 text-center text-zinc-500">Загружаем сохраненные слова...</div>
          ) : savedWords.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 flex flex-col items-center gap-2">
              <Languages className="w-12 h-12 text-zinc-700" />
              <p className="text-base text-zinc-300 font-medium">Словарь пока пуст</p>
              <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                Наводите на слова во время просмотра видео, чтобы видеть перевод, и кликайте на них для сохранения во флешкарты.
              </p>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Слов по запросу «{filterSearch}» не найдено
            </div>
          ) : (
            filteredWords.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start justify-between gap-4 hover:border-zinc-700 transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {/* Lemma / Initial form with article */}
                    {item.lemma && item.lemma !== item.word && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-950/60 border border-red-900/50 text-red-400 font-mono font-semibold">
                        {item.lemma}
                      </span>
                    )}

                    <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {item.word}
                    </span>

                    {/* Audio pronunciation button */}
                    <button
                      onClick={() => handleSpeak(item.word)}
                      title="Озвучить"
                      className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    {/* Channel badge */}
                    {item.channel_title && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-medium ml-auto">
                        {item.channel_title}
                      </span>
                    )}
                  </div>

                  {/* Translation */}
                  <p className="text-sm font-semibold text-zinc-200 mb-2 capitalize">
                    {item.translation}
                  </p>

                  {/* Sentence Context */}
                  {(item.sentence || item.context_sentence) && (
                    <p className="text-xs text-zinc-400 italic bg-black/40 p-2 rounded-lg border border-zinc-800/80 leading-relaxed">
                      &ldquo;{item.sentence || item.context_sentence}&rdquo;
                    </p>
                  )}
                </div>

                <button
                  onClick={() => deleteWord(item.word)}
                  title="Удалить карточку"
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Clear Deck Confirmation Modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-sm flex flex-col gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">
                Очистить колоду «{activeDeck === "all" ? "Все слова" : activeDeck}»?
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Вы уверены? Будут удалены все сохраненные слова ({filteredWords.length} шт.). Рекомендуется сначала экспортировать их в .json или .csv.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Отмена
                </button>
                <button
                  onClick={handleClearDeck}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-900/30"
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
