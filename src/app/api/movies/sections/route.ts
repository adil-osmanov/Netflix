import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '844dba0bfd8f3a4f3799f6130ef9e335';

export const dynamic = 'force-dynamic';

interface GenreSectionConfig {
  id: string;
  title: string;
  endpoint: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'trending';
  const yearGte = searchParams.get('yearGte') || '1990';
  const yearLte = searchParams.get('yearLte') || '2026';
  const minRating = searchParams.get('minRating') || '6.0';

  const baseParams = `api_key=${TMDB_API_KEY}&language=ru-RU&vote_average.gte=${minRating}&primary_release_date.gte=${yearGte}-01-01&primary_release_date.lte=${yearLte}-12-31`;
  const tvBaseParams = `api_key=${TMDB_API_KEY}&language=ru-RU&vote_average.gte=${minRating}&first_air_date.gte=${yearGte}-01-01&first_air_date.lte=${yearLte}-12-31`;

  let sectionsConfig: GenreSectionConfig[] = [];

  if (tab === 'trending') {
    // В тренде: микс топовых новинок, фильмов, сериалов и анимации
    sectionsConfig = [
      {
        id: 'trend_now',
        title: 'Популярное сейчас',
        endpoint: `https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_API_KEY}&language=ru-RU`,
      },
      {
        id: 'trend_movies',
        title: 'Горячие новинки кино',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&sort_by=popularity.desc&vote_count.gte=300`,
      },
      {
        id: 'trend_tv',
        title: 'Трендовые сериалы',
        endpoint: `https://api.themoviedb.org/3/discover/tv?${tvBaseParams}&sort_by=popularity.desc&vote_count.gte=200`,
      },
      {
        id: 'trend_cartoons',
        title: 'Популярная анимация',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=16&sort_by=popularity.desc&vote_count.gte=150`,
      },
    ];
  } else if (tab === 'movies') {
    // Фильмы по жанрам
    sectionsConfig = [
      {
        id: 'action',
        title: 'Боевики',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=28&sort_by=popularity.desc&vote_count.gte=250`,
      },
      {
        id: 'scifi',
        title: 'Фантастика',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=878&sort_by=popularity.desc&vote_count.gte=250`,
      },
      {
        id: 'horror',
        title: 'Ужасы и триллеры',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=27,53&sort_by=popularity.desc&vote_count.gte=200`,
      },
      {
        id: 'drama',
        title: 'Драмы',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=18&sort_by=popularity.desc&vote_count.gte=300`,
      },
      {
        id: 'comedy',
        title: 'Комедии',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=35&sort_by=popularity.desc&vote_count.gte=200`,
      },
      {
        id: 'crime',
        title: 'Криминал и детективы',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=80,9648&sort_by=popularity.desc&vote_count.gte=200`,
      },
    ];
  } else if (tab === 'series') {
    // Сериалы по жанрам
    sectionsConfig = [
      {
        id: 'tv_drama',
        title: 'Драматические сериалы',
        endpoint: `https://api.themoviedb.org/3/discover/tv?${tvBaseParams}&with_genres=18&sort_by=popularity.desc&vote_count.gte=150`,
      },
      {
        id: 'tv_scifi',
        title: 'Фантастика и фэнтези',
        endpoint: `https://api.themoviedb.org/3/discover/tv?${tvBaseParams}&with_genres=10765&sort_by=popularity.desc&vote_count.gte=100`,
      },
      {
        id: 'tv_crime',
        title: 'Криминал и детективы',
        endpoint: `https://api.themoviedb.org/3/discover/tv?${tvBaseParams}&with_genres=80,9648&sort_by=popularity.desc&vote_count.gte=100`,
      },
      {
        id: 'tv_action',
        title: 'Боевики и приключения',
        endpoint: `https://api.themoviedb.org/3/discover/tv?${tvBaseParams}&with_genres=10759&sort_by=popularity.desc&vote_count.gte=100`,
      },
      {
        id: 'tv_comedy',
        title: 'Комедийные шоу',
        endpoint: `https://api.themoviedb.org/3/discover/tv?${tvBaseParams}&with_genres=35&sort_by=popularity.desc&vote_count.gte=100`,
      },
    ];
  } else if (tab === 'cartoons') {
    // Мультфильмы и анимация
    sectionsConfig = [
      {
        id: 'cartoons_popular',
        title: 'Популярные мультфильмы',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=16&sort_by=popularity.desc&vote_count.gte=200`,
      },
      {
        id: 'cartoons_family',
        title: 'Семейная анимация',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=16,10751&sort_by=popularity.desc&vote_count.gte=150`,
      },
      {
        id: 'anime',
        title: 'Аниме и фэнтези',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&vote_count.gte=100`,
      },
      {
        id: 'cartoons_adventure',
        title: 'Приключенческие мультфильмы',
        endpoint: `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=16,12&sort_by=popularity.desc&vote_count.gte=150`,
      },
    ];
  }

  try {
    const sections = await Promise.all(
      sectionsConfig.map(async (sec) => {
        try {
          const res = await fetch(sec.endpoint, { next: { revalidate: 3600 } });
          if (!res.ok) return { id: sec.id, title: sec.title, items: [] };
          const data = await res.json();

          const isTvSection = tab === 'series' || sec.id.startsWith('tv_') || sec.id === 'trend_tv';

          const items = (data.results || [])
            .filter((m: any) => (m.backdrop_path || m.poster_path) && (m.title || m.name))
            .map((m: any) => ({
              id: m.id,
              title: m.title || m.name,
              original_title: m.original_title || m.original_name,
              overview: m.overview || '',
              backdrop: m.backdrop_path
                ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}`
                : `https://image.tmdb.org/t/p/w500${m.poster_path}`,
              poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
              year: (m.release_date || m.first_air_date || '').split('-')[0] || '2026',
              vote_average: m.vote_average ? m.vote_average.toFixed(1) : '7.0',
              media_type: m.media_type === 'tv' || isTvSection ? ('tv' as const) : ('movie' as const),
            }));

          return { id: sec.id, title: sec.title, items };
        } catch {
          return { id: sec.id, title: sec.title, items: [] };
        }
      })
    );

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Movies Sections API Error:', error);
    return NextResponse.json({ sections: [] }, { status: 500 });
  }
}
