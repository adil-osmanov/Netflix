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
    id: 'vidsrc_xyz',
    name: 'VidSrc XYZ',
    badge: 'HD • Быстрый CDN',
    getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}-${e}`,
  },
  {
    id: 'vidsrc_vip',
    name: 'VidSrc VIP',
    badge: 'HD • Зеркало',
    getMovieUrl: (id) => `https://vidsrc.vip/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.vip/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'twoembed',
    name: '2Embed CC',
    badge: '1080p • Резерв',
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
];
