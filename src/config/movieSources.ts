export interface StreamingSource {
  id: string;
  name: string;
  badge: string;
  getUrl: (title: string, year?: string | number, tmdbId?: number | string) => string;
}

export const MOVIE_SOURCES: StreamingSource[] = [
  {
    id: 'cinejoy',
    name: 'Cinejoy',
    badge: 'Основной',
    getUrl: (title) => `https://cinejoy.pk/?s=${encodeURIComponent(title)}`,
  },
  {
    id: 'vidsrc',
    name: 'VidSrc Stream',
    badge: 'Плеер HD',
    getUrl: (title, year, tmdbId) =>
      tmdbId
        ? `https://vidsrc.to/embed/movie/${tmdbId}`
        : `https://vidsrc.to/embed/movie?query=${encodeURIComponent(title)}`,
  },
  {
    id: 'fmovies',
    name: 'FMovies',
    badge: 'Зеркало 1',
    getUrl: (title) => `https://fmovies.to/search?keyword=${encodeURIComponent(title)}`,
  },
  {
    id: 'binged',
    name: 'AutoSearch',
    badge: 'Зеркало 2',
    getUrl: (title, year) =>
      `https://www.google.com/search?q=${encodeURIComponent(`${title} ${year || ''} watch online full movie free`)}`,
  },
];
