import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '844dba0bfd8f3a4f3799f6130ef9e335';

export const dynamic = 'force-dynamic';

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
    overview: 'The story of J. Robert Oppenheimer\'s role in the development of the atomic bomb during World War II.',
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
  },
  {
    id: 27205,
    title: 'Inception',
    original_title: 'Inception',
    overview: 'Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life as payment for a task considered to be impossible: "inception".',
    poster: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
    year: '2010',
    vote_average: '8.4',
    media_type: 'movie' as const,
  },
  {
    id: 66732,
    title: 'Stranger Things',
    original_title: 'Stranger Things',
    overview: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    poster: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    year: '2016',
    vote_average: '8.6',
    media_type: 'tv' as const,
  },
  {
    id: 533535,
    title: 'Deadpool & Wolverine',
    original_title: 'Deadpool & Wolverine',
    overview: 'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again.',
    poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/yDHYTjA3R0ne82IsN9CVv51g071.jpg',
    year: '2024',
    vote_average: '7.7',
    media_type: 'movie' as const,
  },
  {
    id: 119051,
    title: 'Wednesday',
    original_title: 'Wednesday',
    overview: 'A sleuthing, supernaturally infused mystery charting Wednesday Addams\' years as a student at Nevermore Academy.',
    poster: 'https://image.tmdb.org/t/p/w500/9PFonB99qQmA37a2s2NsSTezOoO.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/iHSwvRVsRyxKuOCzgEcBmILti4P.jpg',
    year: '2022',
    vote_average: '8.4',
    media_type: 'tv' as const,
  },
  {
    id: 558449,
    title: 'Gladiator II',
    original_title: 'Gladiator II',
    overview: 'Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered by the tyrannical Emperors.',
    poster: 'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/euYIwmwkmz95mnEx7vA4949Ro5H.jpg',
    year: '2024',
    vote_average: '7.0',
    media_type: 'movie' as const,
  },
  {
    id: 1022789,
    title: 'Inside Out 2',
    original_title: 'Inside Out 2',
    overview: 'Teenager Riley\'s mind headquarters is undergoing a sudden demolition to make room for something entirely unexpected: new Emotions!',
    poster: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/stKGOmPAgAOxwpm5JglIqgZ4q57.jpg',
    year: '2024',
    vote_average: '7.6',
    media_type: 'movie' as const,
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const category = searchParams.get('category') || 'trending';
  const page = searchParams.get('page') || '1';

  try {
    let endpoint = '';

    if (query && query.trim().length > 0) {
      // Полнотекстовый поиск по ВСЕМ фильмам и сериалам мира
      endpoint = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        query.trim()
      )}&page=${page}&language=en-US&include_adult=false`;
    } else {
      // Сортировка по категориям
      switch (category) {
        case 'series':
          endpoint = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=${page}&language=en-US&with_original_language=en`;
          break;
        case 'top_rated':
          endpoint = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}&language=en-US`;
          break;
        case 'action':
          endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28,878&sort_by=popularity.desc&page=${page}&language=en-US`;
          break;
        case 'comedy':
          endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=35&sort_by=popularity.desc&page=${page}&language=en-US`;
          break;
        case 'animation':
          endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=16&sort_by=popularity.desc&page=${page}&language=en-US`;
          break;
        case 'trending':
        default:
          endpoint = `https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_API_KEY}&page=${page}&language=en-US`;
          break;
      }
    }

    const res = await fetch(endpoint, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error('Ошибка запроса к TMDB');

    const data = await res.json();
    const results = (data.results || [])
      .filter((m: any) => m.poster_path && (m.title || m.name))
      .map((m: any) => ({
        id: m.id,
        title: m.title || m.name,
        original_title: m.original_title || m.original_name,
        overview: m.overview,
        poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
        year: (m.release_date || m.first_air_date || '').split('-')[0] || '2026',
        vote_average: m.vote_average ? m.vote_average.toFixed(1) : '7.5',
        media_type: m.media_type === 'tv' || category === 'series' ? ('tv' as const) : ('movie' as const),
      }));

    if (results.length === 0 && !query && page === '1') {
      return NextResponse.json({
        items: FALLBACK_ITEMS,
        page: 1,
        totalPages: 10,
      });
    }

    return NextResponse.json({
      items: results,
      page: data.page || Number(page),
      totalPages: data.total_pages || 100,
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
    return NextResponse.json({ items: [], page: Number(page), totalPages: 1 }, { status: 500 });
  }
}
