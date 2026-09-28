"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWatchedHistoryAction, toggleWatchedAction } from '@/app/watched_actions';

type WatchedItem = {
  content_id: string;
  episode_id: string | null;
};

interface WatchedContextType {
  watchedItems: WatchedItem[];
  isWatched: (contentId: string, episodeId?: string | null) => boolean;
  toggleWatched: (contentId: string, episodeId?: string | null) => void;
  getCollectionProgress: (contentId: string, totalEpisodes: number) => number;
}

const WatchedContext = createContext<WatchedContextType>({
  watchedItems: [],
  isWatched: () => false,
  toggleWatched: () => {},
  getCollectionProgress: () => 0,
});

export function WatchedProvider({ children }: { children: React.ReactNode }) {
  const [watchedItems, setWatchedItems] = useState<WatchedItem[]>([]);

  useEffect(() => {
    getWatchedHistoryAction().then(data => {
      setWatchedItems(data);
    });
  }, []);

  const isWatched = useCallback((contentId: string, episodeId: string | null = null) => {
    return watchedItems.some(item => item.content_id === contentId && item.episode_id === episodeId);
  }, [watchedItems]);

  const toggleWatched = useCallback(async (contentId: string, episodeId: string | null = null) => {
    const currentlyWatched = isWatched(contentId, episodeId);
    const newWatchedState = !currentlyWatched;

    // Optimistic update
    setWatchedItems(prev => {
      if (newWatchedState) {
        return [...prev, { content_id: contentId, episode_id: episodeId }];
      } else {
        return prev.filter(item => !(item.content_id === contentId && item.episode_id === episodeId));
      }
    });

    // Server update
    await toggleWatchedAction(contentId, episodeId, newWatchedState);
  }, [isWatched]);

  const getCollectionProgress = useCallback((contentId: string, totalEpisodes: number) => {
    if (totalEpisodes === 0) return 0;
    const watchedCount = watchedItems.filter(item => item.content_id === contentId && item.episode_id !== null).length;
    return (watchedCount / totalEpisodes) * 100;
  }, [watchedItems]);

  return (
    <WatchedContext.Provider value={{ watchedItems, isWatched, toggleWatched, getCollectionProgress }}>
      {children}
    </WatchedContext.Provider>
  );
}

export function useWatched() {
  return useContext(WatchedContext);
}
