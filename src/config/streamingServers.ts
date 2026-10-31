export interface StreamingServer {
  id: string;
  name: string;
  badge: string;
  getMovieUrl: (tmdbId: string | number) => string;
  getTvUrl: (tmdbId: string | number, season: number, episode: number) => string;
}

export const STREAMING_SERVERS: StreamingServer[] = [
  {
    id: 'vidlink',
    name: 'VidLink PRO',
    badge: '1080p • Основной (FMHY #1)',
    // Плеер с чистым интерфейсом без рекламы и поддержкой субтитров
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=e50914&autoplay=false`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=e50914`,
  },
  {
    id: 'embedsu',
    name: 'Embed.su',
    badge: 'HD • Скоростной',
    // Отличная база фильмов и сериалов, всегда отдает 1080p
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'vidsrccc',
    name: 'VidSrc CC',
    badge: 'HD • Резерв 1',
    getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed',
    badge: 'Multi-Server • Резерв 2',
    getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
];
