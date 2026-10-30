"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserWord, YouTubeRecommendedVideo } from "@/types/youtube";
import { 
  getSavedWordsAction, 
  deleteSavedWordAction,
  deleteVideoWordsAction,
  clearChannelDeckAction,
  getFavoritesAction,
  toggleFavoriteAction,
  removeFavoriteAction
} from "@/app/youtube/actions";

export type SubtitleFontSize = "sm" | "md" | "lg";

export const SUBTITLE_FONT_SIZE_CLASSES: Record<SubtitleFontSize, string> = {
  sm: "text-base md:text-lg",
  md: "text-xl md:text-2xl",
  lg: "text-2xl md:text-3xl lg:text-4xl",
};

export interface SubtitleSettings {
  backdropOpacity: number; // 0 to 100
  bottomOffset: "bottom-4" | "bottom-8" | "bottom-14" | "bottom-20";
  fontSize: SubtitleFontSize;
}

const DEFAULT_SETTINGS: SubtitleSettings = {
  backdropOpacity: 85,
  bottomOffset: "bottom-8",
  fontSize: "md",
};

interface YouTubeContextType {
  currentLang: "DE" | "EN";
  setLanguage: (lang: "DE" | "EN") => void;
  isDictionaryOpen: boolean;
  openDictionary: () => void;
  closeDictionary: () => void;
  savedWords: UserWord[];
  isLoadingWords: boolean;
  refreshSavedWords: () => Promise<void>;
  deleteWord: (word: string) => Promise<void>;
  deleteVideoWords: (videoId: string) => Promise<void>;
  clearChannelDeck: (channel: string) => Promise<void>;
  subtitleSettings: SubtitleSettings;
  updateSubtitleSettings: (newSettings: Partial<SubtitleSettings>) => void;
  // Favorites system (isolated per language)
  favorites: YouTubeRecommendedVideo[];
  favoritesDE: YouTubeRecommendedVideo[];
  favoritesEN: YouTubeRecommendedVideo[];
  isFavorite: (videoId: string) => boolean;
  toggleFavorite: (video: YouTubeRecommendedVideo) => Promise<void>;
  removeFavorite: (videoId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const YouTubeContext = createContext<YouTubeContextType | undefined>(undefined);

export function YouTubeProvider({ children }: { children: React.ReactNode }) {
  const [currentLang, setCurrentLang] = useState<"DE" | "EN">("DE");
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [savedWords, setSavedWords] = useState<UserWord[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(DEFAULT_SETTINGS);
  const [favoritesDE, setFavoritesDE] = useState<YouTubeRecommendedVideo[]>([]);
  const [favoritesEN, setFavoritesEN] = useState<YouTubeRecommendedVideo[]>([]);

  // Load app_lang, subtitle settings & isolated favorites from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedLang = localStorage.getItem("app_lang");
      if (savedLang === "DE" || savedLang === "EN") {
        setCurrentLang(savedLang);
      }
    } catch {}

    try {
      const stored = localStorage.getItem("yt_de_subtitle_settings");
      if (stored) {
        setSubtitleSettings(JSON.parse(stored));
      }
    } catch {}

    try {
      const storedDe = localStorage.getItem("favorites_de") || localStorage.getItem("netflix_favorites");
      if (storedDe) {
        const parsed = JSON.parse(storedDe);
        if (Array.isArray(parsed)) {
          setFavoritesDE(parsed);
          localStorage.setItem("favorites_de", JSON.stringify(parsed));
        }
      }
    } catch {}

    try {
      const storedEn = localStorage.getItem("favorites_en");
      if (storedEn) {
        const parsed = JSON.parse(storedEn);
        if (Array.isArray(parsed)) {
          setFavoritesEN(parsed);
        }
      }
    } catch {}

    // Fetch server favorites for DE and merge
    refreshFavorites();
  }, []);

  const setLanguage = useCallback((lang: "DE" | "EN") => {
    setCurrentLang(lang);
    try {
      localStorage.setItem("app_lang", lang);
    } catch {}
  }, []);

  const updateSubtitleSettings = (newSettings: Partial<SubtitleSettings>) => {
    setSubtitleSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem("yt_de_subtitle_settings", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const refreshSavedWords = async () => {
    setIsLoadingWords(true);
    try {
      const res = await getSavedWordsAction();
      if (res.success && res.data) {
        setSavedWords(res.data);
      }
    } catch {} finally {
      setIsLoadingWords(false);
    }
  };

  const deleteWord = async (word: string) => {
    setSavedWords((prev) => prev.filter((item) => item.word.toLowerCase() !== word.toLowerCase()));
    await deleteSavedWordAction(word);
  };

  const deleteVideoWords = async (videoId: string) => {
    setSavedWords((prev) => prev.filter((item) => item.video_id !== videoId));
    await deleteVideoWordsAction(videoId);
    await refreshSavedWords();
  };

  const clearChannelDeck = async (channel: string) => {
    if (channel === "all") {
      setSavedWords([]);
    } else {
      setSavedWords((prev) => prev.filter((item) => (item.channel_title || "Общее") !== channel));
    }
    await clearChannelDeckAction(channel);
    await refreshSavedWords();
  };

  const openDictionary = () => {
    setIsDictionaryOpen(true);
    refreshSavedWords();
  };

  const closeDictionary = () => {
    setIsDictionaryOpen(false);
  };

  // Favorites logic (isolated by language)
  const favorites = currentLang === "EN" ? favoritesEN : favoritesDE;

  const refreshFavorites = useCallback(async () => {
    try {
      const res = await getFavoritesAction();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setFavoritesDE((prev) => {
          const map = new Map<string, YouTubeRecommendedVideo>();
          for (const v of prev) map.set(v.id, v);
          for (const v of res.data) map.set(v.id, v);
          const merged = Array.from(map.values());
          try {
            localStorage.setItem("favorites_de", JSON.stringify(merged));
            localStorage.setItem("netflix_favorites", JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch {}
  }, []);

  const isFavorite = useCallback(
    (videoId: string) => {
      return favorites.some((v) => v.id === videoId);
    },
    [favorites]
  );

  const toggleFavorite = async (video: YouTubeRecommendedVideo) => {
    if (currentLang === "EN") {
      const exists = favoritesEN.some((v) => v.id === video.id);
      const updated = exists
        ? favoritesEN.filter((v) => v.id !== video.id)
        : [video, ...favoritesEN.filter((v) => v.id !== video.id)];
      setFavoritesEN(updated);
      try {
        localStorage.setItem("favorites_en", JSON.stringify(updated));
      } catch {}
      return;
    }

    const exists = favoritesDE.some((v) => v.id === video.id);
    const updated = exists
      ? favoritesDE.filter((v) => v.id !== video.id)
      : [video, ...favoritesDE.filter((v) => v.id !== video.id)];
    setFavoritesDE(updated);
    try {
      localStorage.setItem("favorites_de", JSON.stringify(updated));
      localStorage.setItem("netflix_favorites", JSON.stringify(updated));
    } catch {}

    try {
      await toggleFavoriteAction(video);
    } catch {}
  };

  const removeFavorite = async (videoId: string) => {
    if (currentLang === "EN") {
      const updated = favoritesEN.filter((v) => v.id !== videoId);
      setFavoritesEN(updated);
      try {
        localStorage.setItem("favorites_en", JSON.stringify(updated));
      } catch {}
      return;
    }

    const updated = favoritesDE.filter((v) => v.id !== videoId);
    setFavoritesDE(updated);
    try {
      localStorage.setItem("favorites_de", JSON.stringify(updated));
      localStorage.setItem("netflix_favorites", JSON.stringify(updated));
    } catch {}
    try {
      await removeFavoriteAction(videoId);
    } catch {}
  };

  return (
    <YouTubeContext.Provider
      value={{
        currentLang,
        setLanguage,
        isDictionaryOpen,
        openDictionary,
        closeDictionary,
        savedWords,
        isLoadingWords,
        refreshSavedWords,
        deleteWord,
        deleteVideoWords,
        clearChannelDeck,
        subtitleSettings,
        updateSubtitleSettings,
        favorites,
        favoritesDE,
        favoritesEN,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        refreshFavorites,
      }}
    >
      {children}
    </YouTubeContext.Provider>
  );
}

export function useYouTube() {
  const context = useContext(YouTubeContext);
  if (!context) {
    throw new Error("useYouTube must be used within a YouTubeProvider");
  }
  return context;
}
