export type Language = 'DE' | 'EN';
export type GermanLevel = 'B1' | 'B2' | 'C1';
export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export const DE_LEVELS: GermanLevel[] = ['B1', 'B2', 'C1'];
export const EN_LEVELS: EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

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
  category?: string;
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
  channel?: string;        // канал
  category?: string;       // категория ('american_english' | 'recommendations' | 'podcasts')
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  duration_str?: string;   // например, "14:20"
  duration?: string;       // синоним duration_str
  order_index?: number;    // порядковый номер серии/шага
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
