import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '844dba0bfd8f3a4f3799f6130ef9e335';

export const dynamic = 'force-dynamic';

// Алгоритм перемешивания Фишера-Йетса для создания ощущения "живой" персонализированной ленты
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const FALLBACK_ITEMS = [
  {
    id: 155,
    title: 'The Dark Knight',
    original_title: 'The Dark Knight',
    overview: 'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.',
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    year: '2008',
    vote_average: '8.5',
    media_type: 'movie' as const,
  },
  {
    id: 1399,
    title: 'Game of Thrones',
    original_title: 'Game of Thrones',
    overview: 'Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war. All while a very ancient evil awakens in the farthest north.',
    poster: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1qv138.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
    year: '2011',
    vote_average: '8.4',
    media_type: 'tv' as const,
  },
  {
    id: 872585,
    title: 'Oppenheimer',
    original_title: 'Oppenheimer',
    overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    year: '2023',
    vote_average: '8.1',
    media_type: 'movie' as const,
  },
  {
    id: 693134,
    title: 'Dune: Part Two',
    original_title: 'Dune: Part Two',
    overview: 'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.',
    poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520QIq.jpg',
    year: '2024',
    vote_average: '8.2',
    media_type: 'movie' as const,
  },
  {
    id: 94605,
    title: 'Arcane',
    original_title: 'Arcane',
    overview: 'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and incompatible convictions.',
    poster: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/7k3zT9z1g6k6hFqX7k2z1g6k6hF.jpg',
    year: '2021',
    vote_average: '8.7',
    media_type: 'tv' as const,
  },
  {
    id: 157336,
    title: 'Interstellar',
    original_title: 'Interstellar',
    overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.',
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    year: '2014',
    vote_average: '8.4',
    media_type: 'movie' as const,
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const category = searchParams.get('category') || 'trending';
  const pageParam = searchParams.get('page');
  const isRefresh = searchParams.get('refresh') === 'true';

  try {
    let endpoint = '';

    if (query && query.trim().length > 0) {
      // Полнотекстовый поиск по запросу пользователя
      const p = pageParam || '1';
      endpoint = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        query.trim()
      )}&page=${p}&language=en-US&include_adult=false`;
    } else {
      // Если это клик на "обновить", выбираем случайную страницу из топ-пула (1-4)
      const targetPage = isRefresh ? Math.floor(Math.random() * 4) + 1 : Number(pageParam || '1');

      switch (category) {
        case 'trending':
          // Микс из трендов с высоким рейтингом
          endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&vote_count.gte=350&vote_average.gte=6.7&with_original_language=en&page=${targetPage}&language=en-US`;
          break;
        case 'series':
          // Только признанные сериалы с оригинальной английской озвучкой
          endpoint = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&vote_count.gte=250&vote_average.gte=7.0&with_original_language=en&page=${targetPage}&language=en-US`;
          break;
        case 'top_rated':
          // Золотой фонд кинематографа (рейтинг от 7.8+)
          endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=vote_average.desc&vote_count.gte=1000&with_original_language=en&page=${targetPage}&language=en-US`;
          break;
        case 'action':
          // Боевики и приключения без мусора
          endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28,878&sort_by=popularity.desc&vote_count.gte=300&vote_average.gte=6.5&with_original_language=en&page=${targetPage}&language=en-US`;
          break;
        case 'scifi':
          // Фантастика и фэнтези
          endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=878,14&sort_by=popularity.desc&vote_count.gte=300&vote_average.gte=6.5&with_original_language=en&page=${targetPage}&language=en-US`;
          break;
        case 'drama':
          // Детективы, криминал, драмы
          endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=18,80&sort_by=popularity.desc&vote_count.gte=300&vote_average.gte=7.0&with_original_language=en&page=${targetPage}&language=en-US`;
          break;
        case 'comedy':
          endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=35&sort_by=popularity.desc&vote_count.gte=300&vote_average.gte=6.5&with_original_language=en&page=${targetPage}&language=en-US`;
          break;
        case 'animation':
          endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=16&sort_by=popularity.desc&vote_count.gte=200&vote_average.gte=6.5&with_original_language=en&page=${targetPage}&language=en-US`;
          break;
        default:
          endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&vote_count.gte=300&vote_average.gte=6.7&with_original_language=en&page=${targetPage}&language=en-US`;
          break;
      }
    }

    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) throw new Error('Ошибка запроса к TMDB');

    const data = await res.json();
    let results = (data.results || [])
      .filter((m: any) => m.poster_path && (m.title || m.name))
      // Отсеиваем фильмы с рейтингом ниже 6.0
      .filter((m: any) => (query ? true : (m.vote_average || 0) >= 6.0))
      .map((m: any) => ({
        id: m.id,
        title: m.title || m.name,
        original_title: m.original_title || m.original_name,
        overview: m.overview || '',
        poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
        year: (m.release_date || m.first_air_date || '').split('-')[0] || '2026',
        vote_average: m.vote_average ? m.vote_average.toFixed(1) : '7.0',
        media_type: m.media_type === 'tv' || category === 'series' ? ('tv' as const) : ('movie' as const),
      }));

    // Если это рекомендации или обновление, слегка перемешиваем выдачу
    if (isRefresh || category === 'trending') {
      results = shuffleArray(results);
    }

    if (results.length === 0 && !query && (!pageParam || pageParam === '1')) {
      return NextResponse.json({
        items: FALLBACK_ITEMS,
        page: 1,
        totalPages: 10,
      });
    }

    return NextResponse.json({
      items: results,
      page: data.page || (pageParam ? Number(pageParam) : 1),
      totalPages: data.total_pages || 10,
    });
  } catch (error) {
    console.error('Movies API Error:', error);
    if (!query && (!pageParam || pageParam === '1')) {
      return NextResponse.json({
        items: FALLBACK_ITEMS,
        page: 1,
        totalPages: 10,
      });
    }
    return NextResponse.json({ items: [], page: 1, totalPages: 1 }, { status: 500 });
  }
}
