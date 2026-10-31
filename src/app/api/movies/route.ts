import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '844dba0bfd8f3a4f3799f6130ef9e335';

export const dynamic = 'force-dynamic';

// Алгоритм перемешивания Фишера-Йетса для создания ощущения "живой" ленты
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
    title: 'Тёмный рыцарь',
    original_title: 'The Dark Knight',
    overview: 'Бэтмен поднимает ставки в войне с криминалом. С помощью лейтенанта Джима Гордона и прокурора Харви Дента он намерен очистить улицы от преступности.',
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    year: '2008',
    vote_average: '8.5',
    media_type: 'movie' as const,
  },
  {
    id: 1399,
    title: 'Игра престолов',
    original_title: 'Game of Thrones',
    overview: 'К концу подходит время благоденствия, и лето, длившееся почти десятилетие, уступает место зиме. Вокруг Железного Трона зреет заговор.',
    poster: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1qv138.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
    year: '2011',
    vote_average: '8.4',
    media_type: 'tv' as const,
  },
  {
    id: 872585,
    title: 'Оппенгеймер',
    original_title: 'Oppenheimer',
    overview: 'История жизни американского физика-теоретика Роберта Оппенгеймера, стоящего во главе «Манхэттенского проекта» — секретной программы по разработке ядерного оружия.',
    poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    year: '2023',
    vote_average: '8.1',
    media_type: 'movie' as const,
  },
  {
    id: 693134,
    title: 'Дюна: Часть вторая',
    original_title: 'Dune: Part Two',
    overview: 'Герцог Пол Атрейдес присоединяется к фременам, чтобы отомстить заговорщикам, уничтожившим его семью.',
    poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520QIq.jpg',
    year: '2024',
    vote_average: '8.2',
    media_type: 'movie' as const,
  },
  {
    id: 94605,
    title: 'Аркейн',
    original_title: 'Arcane',
    overview: 'История разворачивается в утопическом краю Пилтовер и жестоком подземном мире Заун. Две сестры оказываются по разные стороны баррикад.',
    poster: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/7k3zT9z1g6k6hFqX7k2z1g6k6hF.jpg',
    year: '2021',
    vote_average: '8.7',
    media_type: 'tv' as const,
  },
  {
    id: 157336,
    title: 'Интерстеллар',
    original_title: 'Interstellar',
    overview: 'Когда засуха, пыльные бури и вымирание растений приводят человечество к продовольственному кризису, группа исследователей отправляется в червоточину.',
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
  const page = searchParams.get('page') || '1';
  const yearParam = searchParams.get('year');
  const yearGte = searchParams.get('yearGte') || (yearParam && yearParam !== 'all' ? yearParam : '1990');
  const yearLte = searchParams.get('yearLte') || (yearParam && yearParam !== 'all' ? yearParam : '2026');
  const minRating = searchParams.get('minRating') || '6.0';
  const isRefresh = searchParams.get('refresh') === 'true';

  try {
    let endpoint = '';

    if (query && query.trim().length > 0) {
      endpoint = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        query.trim()
      )}&page=${page}&language=ru-RU&include_adult=false`;
    } else {
      const targetPage = isRefresh ? Math.floor(Math.random() * 4) + 1 : Number(page || '1');
      let baseParams = `api_key=${TMDB_API_KEY}&language=ru-RU&page=${targetPage}`;
      baseParams += `&primary_release_date.gte=${yearGte}-01-01&primary_release_date.lte=${yearLte}-12-31`;
      baseParams += `&first_air_date.gte=${yearGte}-01-01&first_air_date.lte=${yearLte}-12-31`;
      baseParams += `&vote_average.gte=${minRating}`;

      switch (category) {
        case 'top_rated':
          // Топ рейтинг теперь идет вторым
          endpoint = `https://api.themoviedb.org/3/discover/movie?${baseParams}&sort_by=vote_average.desc&vote_count.gte=800`;
          break;
        case 'series':
          // Сериалы идут третьими
          endpoint = `https://api.themoviedb.org/3/discover/tv?${baseParams}&sort_by=popularity.desc&vote_count.gte=150`;
          break;
        case 'action':
          endpoint = `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=28,878&sort_by=popularity.desc&vote_count.gte=200`;
          break;
        case 'scifi':
          endpoint = `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=878,14&sort_by=popularity.desc&vote_count.gte=200`;
          break;
        case 'drama':
          endpoint = `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=18,80&sort_by=popularity.desc&vote_count.gte=200`;
          break;
        case 'comedy':
          endpoint = `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=35&sort_by=popularity.desc&vote_count.gte=150`;
          break;
        case 'animation':
          endpoint = `https://api.themoviedb.org/3/discover/movie?${baseParams}&with_genres=16&sort_by=popularity.desc&vote_count.gte=100`;
          break;
        case 'trending':
        default:
          endpoint = `https://api.themoviedb.org/3/discover/movie?${baseParams}&sort_by=popularity.desc&vote_count.gte=250`;
          break;
      }
    }

    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) throw new Error('Ошибка запроса к TMDB');

    const data = await res.json();
    let results = (data.results || [])
      .filter((m: any) => m.poster_path && (m.title || m.name))
      .map((m: any) => {
        const titleRu = m.title || m.name;
        const titleEn = m.original_title || m.original_name;
        return {
          id: m.id,
          // Название на русском, если нет — на языке оригинала
          title: titleRu || titleEn,
          original_title: titleEn,
          overview: m.overview || '',
          poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
          backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
          year: (m.release_date || m.first_air_date || '').split('-')[0] || '2026',
          vote_average: m.vote_average ? m.vote_average.toFixed(1) : '7.0',
          media_type: m.media_type === 'tv' || category === 'series' ? ('tv' as const) : ('movie' as const),
        };
      });

    if (isRefresh || category === 'trending') {
      results = shuffleArray(results);
    }

    if (results.length === 0 && !query && page === '1') {
      return NextResponse.json({
        items: FALLBACK_ITEMS,
        page: 1,
        totalPages: 10,
      });
    }

    return NextResponse.json({
      items: results,
      page: data.page || (page ? Number(page) : 1),
      totalPages: data.total_pages || 10,
    });
  } catch (error) {
    console.error('Movies API Error:', error);
    if (!query && page === '1') {
      return NextResponse.json({
        items: FALLBACK_ITEMS,
        page: 1,
        totalPages: 10,
      });
    }
    return NextResponse.json({ items: [], page: 1, totalPages: 1 }, { status: 500 });
  }
}
