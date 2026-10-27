"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserWord } from "@/types/youtube";
import { getSavedWordsAction, deleteSavedWordAction } from "@/app/youtube/actions";

export type SubtitleFontSize = "sm" | "md" | "lg";

export const SUBTITLE_FONT_SIZE_CLASSES: Record<SubtitleFontSize, string> = {
  sm: "text-sm sm:text-base md:text-lg",
  md: "text-base sm:text-lg md:text-xl",
  lg: "text-lg sm:text-xl md:text-2xl",
};

export interface SubtitleSettings {
  backdropOpacity: number; // 0 to 100
  bottomOffset: "bottom-4" | "bottom-10" | "bottom-20";
  fontSize: SubtitleFontSize;
}

const DEFAULT_SETTINGS: SubtitleSettings = {
  backdropOpacity: 85,
  bottomOffset: "bottom-10",
  fontSize: "md",
};

interface YouTubeContextType {
  isDictionaryOpen: boolean;
  openDictionary: () => void;
  closeDictionary: () => void;
  savedWords: UserWord[];
  isLoadingWords: boolean;
  refreshSavedWords: () => Promise<void>;
  deleteWord: (word: string) => Promise<void>;
  subtitleSettings: SubtitleSettings;
  updateSubtitleSettings: (newSettings: Partial<SubtitleSettings>) => void;
}

const YouTubeContext = createContext<YouTubeContextType | undefined>(undefined);

export function YouTubeProvider({ children }: { children: React.ReactNode }) {
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [savedWords, setSavedWords] = useState<UserWord[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(DEFAULT_SETTINGS);

  // Load subtitle settings from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("yt_de_subtitle_settings");
      if (stored) {
        setSubtitleSettings(JSON.parse(stored));
      }
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

  const openDictionary = () => {
    setIsDictionaryOpen(true);
    refreshSavedWords();
  };

  const closeDictionary = () => {
    setIsDictionaryOpen(false);
  };

  return (
    <YouTubeContext.Provider
      value={{
        isDictionaryOpen,
        openDictionary,
        closeDictionary,
        savedWords,
        isLoadingWords,
        refreshSavedWords,
        deleteWord,
        subtitleSettings,
        updateSubtitleSettings,
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
