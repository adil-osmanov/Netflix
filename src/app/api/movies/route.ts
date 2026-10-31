import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '844dba0bfd8f3a4f3799f6130ef9e335';

export const dynamic = 'force-dynamic';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const tab = searchParams.get('tab') || 'trending';
  const genre = searchParams.get('genre') || 'all';
  const page = searchParams.get('page') || '1';
  const isRefresh = searchParams.get('refresh') === 'true';
  const yearGte = searchParams.get('yearGte') || '1990';
  const yearLte = searchParams.get('yearLte') || '2026';
  const minRating = searchParams.get('minRating') || '6.0';

  const pageNum = parseInt(page, 10) || 1;
  const isSearch = Boolean(query && query.trim().length > 0);
  const targetPage = !isSearch && isRefresh && pageNum === 1 ? Math.floor(Math.random() * 5) + 1 : pageNum;

  try {
    let endpoint = '';

    if (isSearch) {
      endpoint = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        query!.trim()
      )}&page=${targetPage}&language=ru-RU&include_adult=false`;
    } else {
      const base = `api_key=${TMDB_API_KEY}&language=ru-RU&page=${targetPage}&vote_average.gte=${minRating}&primary_release_date.gte=${yearGte}-01-01&primary_release_date.lte=${yearLte}-12-31`;

      if (tab === 'trending') {
        endpoint = `https://api.themoviedb.org/3/discover/movie?${base}&sort_by=popularity.desc&vote_count.gte=50`;
      } else if (tab === 'movies') {
        const genreParam = genre !== 'all' ? `&with_genres=${genre}` : '';
        endpoint = `https://api.themoviedb.org/3/discover/movie?${base}&sort_by=popularity.desc&vote_count.gte=50${genreParam}`;
      } else if (tab === 'series') {
        const genreParam = genre !== 'all' ? `&with_genres=${genre}` : '';
        endpoint = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=ru-RU&page=${targetPage}&vote_average.gte=${minRating}&first_air_date.gte=${yearGte}-01-01&first_air_date.lte=${yearLte}-12-31&sort_by=popularity.desc&vote_count.gte=30${genreParam}`;
      } else if (tab === 'cartoons') {
        const genreParam = genre === 'anime' ? '&with_original_language=ja' : '';
        const familyParam = genre === 'family' ? '&with_genres=16,10751' : '&with_genres=16';
        endpoint = `https://api.themoviedb.org/3/discover/movie?${base}${familyParam}&sort_by=popularity.desc&vote_count.gte=30${genreParam}`;
      } else {
        endpoint = `https://api.themoviedb.org/3/discover/movie?${base}&sort_by=popularity.desc&vote_count.gte=50`;
      }
    }

    const res = await fetch(endpoint, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error('Ошибка запроса TMDB');

    const data = await res.json();
    let rawResults = data.results || [];

    if (!isSearch && isRefresh && rawResults.length > 0) {
      rawResults = shuffleArray(rawResults);
    }

    const items = rawResults
      .filter((m: any) => m.poster_path && (m.title || m.name))
      .map((m: any) => ({
        id: m.id,
        title: m.title || m.name,
        original_title: m.original_title || m.original_name,
        overview: m.overview || '',
        poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
        year: (m.release_date || m.first_air_date || '').split('-')[0] || '2026',
        vote_average: m.vote_average ? Number(m.vote_average).toFixed(1) : '7.0',
        media_type: m.media_type === 'tv' || tab === 'series' ? ('tv' as const) : ('movie' as const),
      }));

    return NextResponse.json({
      items,
      page: pageNum,
      totalPages: data.total_pages || 500,
    });
  } catch (error) {
    console.error('Movies API Error:', error);
    return NextResponse.json({ items: [], page: 1, totalPages: 1 }, { status: 500 });
  }
}
