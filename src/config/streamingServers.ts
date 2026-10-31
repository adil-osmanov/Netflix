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
    badge: '1080p • Основной',
    // Самый чистый плеер, кастомизирован под цвет сайта
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=e50914`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=e50914`,
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed VIP',
    badge: 'Мульти-сервер (100% аптайм)',
    // Автоматически перебирает более 10 скрытых зеркал и выбирает самое быстрое
    getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
  {
    id: 'vidsrc_in',
    name: 'VidSrc Direct',
    badge: 'HD Быстрый CDN',
    getMovieUrl: (id) => `https://vidsrc.in/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.in/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'twoembed',
    name: '2Embed CC',
    badge: 'Резерв',
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
];
