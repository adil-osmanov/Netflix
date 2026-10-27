"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserWord } from "@/types/youtube";
import { 
  getSavedWordsAction, 
  deleteSavedWordAction,
  deleteVideoWordsAction,
  clearChannelDeckAction
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
        deleteVideoWords,
        clearChannelDeck,
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
