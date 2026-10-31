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
    badge: '1080p • Основной плеер',
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=e50914`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=e50914`,
  },
  {
    id: 'vidsrc_su',
    name: 'VidSrc SU',
    badge: 'HD • Быстрый поток',
    // Актуальное стабильное зеркало VidSrc с открытым iframe-доступом
    getMovieUrl: (id) => `https://vidsrc.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'vidsrc_net',
    name: 'VidSrc Direct Net',
    badge: '1080p • Высокая скорость',
    // Прямой доступ без междоменных блокировок
    getMovieUrl: (id) => `https://vidsrc.net/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.net/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'twoembed',
    name: '2Embed CC',
    badge: '1080p • Резервный плеер',
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
];
