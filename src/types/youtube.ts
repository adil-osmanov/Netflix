export interface TranscriptItem {
  text: string;
  start: number;     // in seconds
  duration: number;  // in seconds
}

export interface YouTubeRecommendedVideo {
  id: string;
  title: string;
  channel: string;
  channelId?: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  thumbnailUrl: string;
  description?: string;
  durationText?: string;
  published?: string;
}

export interface QuizItem {
  id: number;
  type: 'cloze' | 'vocab' | 'context';
  question: string;
  options: string[];
  correct: number; // индекс правильного ответа (0, 1, 2...)
}

export interface EasyGermanVideo {
  id: string;              // уникальный ID записи
  youtube_id: string;      // 11 символов ID YouTube
  title: string;           // название
  level: 'B1' | 'B2' | 'C1';
  duration_str?: string;   // например, "14:20"
  is_watched?: boolean;    // статус просмотра
  created_at?: string;
  quiz?: QuizItem[];
}

export interface UserWord {
  id?: string;
  word: string;
  translation: string;
  lemma?: string;
  sentence?: string;
  context_sentence?: string;
  channel_title?: string;
  video_title?: string;
  source: string;
  video_id: string;
  created_at: string;
}

export interface UserFavorite {
  id?: string;
  user_id?: string;
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url?: string;
  duration?: string;
  level?: string;
  created_at?: string;
}

export interface TranslationData {
  lemma: string;
  article: "der" | "die" | "das" | null;
  wordClean: string;
  cleanWord?: string;
  pos: "noun" | "verb" | "adj" | "adv" | "other";
  translation: string;
}

export type YouTubePlayerState = -1 | 0 | 1 | 2 | 3 | 5; // UNSTARTED, ENDED, PLAYING, PAUSED, BUFFERING, CUED
