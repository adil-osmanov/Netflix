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
  level: 'A2' | 'B1' | 'B2' | 'C1';
  thumbnailUrl: string;
  description: string;
  durationText?: string;
}

export interface UserWord {
  id?: string;
  word: string;
  translation: string;
  lemma?: string;
  sentence?: string;
  context_sentence?: string;
  channel_title?: string;
  source: string;
  video_id: string;
  created_at: string;
}

export type YouTubePlayerState = -1 | 0 | 1 | 2 | 3 | 5; // UNSTARTED, ENDED, PLAYING, PAUSED, BUFFERING, CUED
