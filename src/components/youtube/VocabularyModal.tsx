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
  AlertTriangle,
  Tv,
  Film
} from "lucide-react";
import { useYouTube } from "@/context/YouTubeContext";
import { UserWord } from "@/types/youtube";

export default function VocabularyModal() {
  const { 
    isDictionaryOpen, 
    closeDictionary, 
    savedWords, 
    isLoadingWords, 
    deleteWord, 
    deleteVideoWords, 
    clearChannelDeck 
  } = useYouTube();

  const [activeDeck, setActiveDeck] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [videoToDelete, setVideoToDelete] = useState<{ id: string; title: string } | null>(null);

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

  // Group filtered words by video
  const wordsByVideo: Record<string, { title: string; videoId: string; words: UserWord[] }> = {};
  filteredWords.forEach((word) => {
    const key = word.video_id || "general";
    if (!wordsByVideo[key]) {
      wordsByVideo[key] = {
        title: word.video_title || (word.video_id ? `Видео (${word.video_id})` : "Общие слова"),
        videoId: word.video_id,
        words: [],
      };
    }
    wordsByVideo[key].words.push(word);
  });

  const videoGroups = Object.values(wordsByVideo);

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

  // Export Video Words to JSON
  const handleExportVideoJSON = (videoTitle: string, words: UserWord[]) => {
    const exportData = words.map((item) => ({
      word: item.word,
      lemma: item.lemma || item.word,
      translation: item.translation,
      context_sentence: item.sentence || item.context_sentence || "",
      channel: item.channel_title || "Общее",
      video_title: item.video_title || videoTitle,
      video_id: item.video_id,
      date_added: item.created_at,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video_words_${videoTitle.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear Channel Deck
  const handleClearDeck = async () => {
    await clearChannelDeck(activeDeck);
    setShowClearConfirm(false);
  };

  // Delete all words of a specific video
  const handleDeleteVideoWords = async () => {
    if (!videoToDelete) return;
    await deleteVideoWords(videoToDelete.id);
    setVideoToDelete(null);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#181818] border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <BookMarked className="w-5 h-5 text-[#E50914]" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Мой немецкий словарь ({savedWords.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {filteredWords.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportChannelJSON}
                  title="Экспорт всей колоды канала в JSON"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5 text-amber-400" />
                  <span>Экспорт колоды (.json)</span>
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  title="Очистить колоду канала"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/80 text-zinc-400 hover:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Очистить колоду</span>
                </button>
              </div>
            )}

            <button
              onClick={closeDictionary}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Level 1: Channel Tabs */}
        {savedWords.length > 0 && (
          <div className="px-5 py-2.5 bg-zinc-900/40 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {deckKeys.map((deck) => (
              <button
                key={deck}
                onClick={() => setActiveDeck(deck)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeDeck === deck
                    ? "bg-[#E50914] text-white shadow-md shadow-red-950/40"
                    : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <span>{deck === "all" ? "Все каналы" : deck}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    activeDeck === deck
                      ? "bg-white/20 text-white"
                      : "bg-zinc-900 text-zinc-400"
                  }`}
                >
                  {decksMap[deck]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Search Bar */}
        {savedWords.length > 2 && (
          <div className="px-5 py-2.5 bg-zinc-900/30 border-b border-zinc-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Поиск по словам, переводу или названию видео..."
              className="bg-transparent text-xs sm:text-sm text-white placeholder:text-zinc-500 outline-none w-full"
            />
            {filterSearch && (
              <button onClick={() => setFilterSearch("")} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Level 2: Video Groups & Word Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
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
            videoGroups.map((group) => (
              <div key={group.videoId || group.title} className="flex flex-col gap-3 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/80">
                {/* Video Header with Actions */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Film className="w-4 h-4 text-[#E50914] flex-shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-200 truncate">
                      {group.title}
                    </h4>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono flex-shrink-0">
                      {group.words.length} слов
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleExportVideoJSON(group.title, group.words)}
                      title="Экспорт слов этого видео в .json"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium transition cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-amber-400" />
                      <span>Экспорт (.json)</span>
                    </button>
                    {group.videoId && (
                      <button
                        onClick={() => setVideoToDelete({ id: group.videoId, title: group.title })}
                        title="Удалить все слова этого видео"
                        className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Words Grid inside Video */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {group.words.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-start justify-between gap-3 hover:border-zinc-700 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {item.lemma && item.lemma !== item.word && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950/60 border border-red-900/50 text-red-400 font-mono font-semibold">
                              {item.lemma}
                            </span>
                          )}

                          <span className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                            {item.word}
                          </span>

                          <button
                            onClick={() => handleSpeak(item.word)}
                            title="Озвучить"
                            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-xs font-semibold text-zinc-200 mb-1.5 capitalize">
                          {item.translation}
                        </p>

                        {(item.sentence || item.context_sentence) && (
                          <p className="text-[11px] text-zinc-400 italic bg-black/40 p-2 rounded-lg border border-zinc-800/60 leading-relaxed line-clamp-2">
                            &ldquo;{item.sentence || item.context_sentence}&rdquo;
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => deleteWord(item.word)}
                        title="Удалить слово"
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
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

        {/* Delete Video Words Confirmation Modal */}
        {videoToDelete && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-sm flex flex-col gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">
                Удалить слова этого видео?
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                «{videoToDelete.title}»
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setVideoToDelete(null)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDeleteVideoWords}
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
