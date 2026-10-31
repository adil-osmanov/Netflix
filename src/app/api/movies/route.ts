import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '844dba0bfd8f3a4f3799f6130ef9e335';

export const dynamic = 'force-dynamic';

const FALLBACK_MOVIES = [
  {
    id: 155,
    title: 'The Dark Knight',
    original_title: 'The Dark Knight',
    overview: 'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.',
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    release_date: '2008-07-18',
    year: '2008',
    vote_average: '8.5',
  },
  {
    id: 872585,
    title: 'Oppenheimer',
    original_title: 'Oppenheimer',
    overview: 'The story of J. Robert Oppenheimer\'s role in the development of the atomic bomb during World War II.',
    poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    release_date: '2023-07-19',
    year: '2023',
    vote_average: '8.1',
  },
  {
    id: 693134,
    title: 'Dune: Part Two',
    original_title: 'Dune: Part Two',
    overview: 'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.',
    poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520QIq.jpg',
    release_date: '2024-02-27',
    year: '2024',
    vote_average: '8.2',
  },
  {
    id: 533535,
    title: 'Deadpool & Wolverine',
    original_title: 'Deadpool & Wolverine',
    overview: 'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again.',
    poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/yDHYTjA3R0ne82IsN9CVv51g071.jpg',
    release_date: '2024-07-24',
    year: '2024',
    vote_average: '7.7',
  },
  {
    id: 157336,
    title: 'Interstellar',
    original_title: 'Interstellar',
    overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.',
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    release_date: '2014-11-05',
    year: '2014',
    vote_average: '8.4',
  },
  {
    id: 27205,
    title: 'Inception',
    original_title: 'Inception',
    overview: 'Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life as payment for a task considered to be impossible: "inception".',
    poster: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
    release_date: '2010-07-15',
    year: '2010',
    vote_average: '8.4',
  },
  {
    id: 763215,
    title: 'Damsel',
    original_title: 'Damsel',
    overview: 'A young woman agrees to marry a handsome prince, only to discover it was all a trap. She is thrown into a cave with a fire-breathing dragon and must rely on her wits and will to survive.',
    poster: 'https://image.tmdb.org/t/p/w500/AgHbB9D4z9iDCJY2PrvWpWncLJ0.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/deLWkOLZmBNshLC8JVeZ3IeQz6P.jpg',
    release_date: '2024-03-07',
    year: '2024',
    vote_average: '7.1',
  },
  {
    id: 361743,
    title: 'Top Gun: Maverick',
    original_title: 'Top Gun: Maverick',
    overview: 'After more than thirty years of service as one of the Navy’s top aviators, Pete "Maverick" Mitchell is where he belongs, pushing the envelope as a courageous test pilot and dodging the advancement in rank that would ground him.',
    poster: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/Aa9TLpNpBMyRkD8sPJ7YcmVeorP.jpg',
    release_date: '2022-05-24',
    year: '2022',
    vote_average: '8.2',
  },
  {
    id: 933260,
    title: 'The Substance',
    original_title: 'The Substance',
    overview: 'A fading celebrity decides to use a black market drug, a cell-replicating substance that temporarily creates a younger, better version of herself.',
    poster: 'https://image.tmdb.org/t/p/w500/lqoMzCcZYEFK729Fc6rKWZz7SuC.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/uLqSQOzAptUmUMtT142k3223Lp9.jpg',
    release_date: '2024-09-07',
    year: '2024',
    vote_average: '7.3',
  },
  {
    id: 558449,
    title: 'Gladiator II',
    original_title: 'Gladiator II',
    overview: 'Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered by the tyrannical Emperors who now lead Rome with an iron fist.',
    poster: 'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/euYIwmwkmz95mnEx7vA4949Ro5H.jpg',
    release_date: '2024-11-05',
    year: '2024',
    vote_average: '7.0',
  },
  {
    id: 1022789,
    title: 'Inside Out 2',
    original_title: 'Inside Out 2',
    overview: 'Teenager Riley\'s mind headquarters is undergoing a sudden demolition to make room for something entirely unexpected: new Emotions! Joy, Sadness, Anger, Fear and Disgust aren\'t sure how to feel when Anxiety shows up.',
    poster: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/stKGOmPAgAOxwpm5JglIqgZ4q57.jpg',
    release_date: '2024-06-11',
    year: '2024',
    vote_average: '7.6',
  },
  {
    id: 76600,
    title: 'Avatar: The Way of Water',
    original_title: 'Avatar: The Way of Water',
    overview: 'Set more than a decade after the events of the first film, learn the story of the Sully family, the trouble that follows them, the lengths they go to keep each other safe, the battles they fight to stay alive, and the tragedies they endure.',
    poster: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/s16H6tpK2utvwDtzZ8Qy4qm5Emw.jpg',
    release_date: '2022-12-14',
    year: '2022',
    vote_average: '7.6',
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const page = searchParams.get('page') || '1';

  try {
    const endpoint = query
      ? `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}&language=en-US`
      : `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=en&sort_by=popularity.desc&page=${page}`;

    const res = await fetch(endpoint, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error('Ошибка TMDB API');

    const data = await res.json();
    const rawMovies = data.results || [];

    const movies = rawMovies
      .filter((m: any) => m.poster_path) // Исключаем фильмы без постера
      .map((m: any) => ({
        id: m.id,
        title: m.title || m.original_title,
        original_title: m.original_title,
        overview: m.overview,
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
        backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
        release_date: m.release_date,
        year: m.release_date ? m.release_date.split('-')[0] : '',
        vote_average: m.vote_average ? m.vote_average.toFixed(1) : '7.0',
      }));

    if (movies.length === 0 && !query) {
      return NextResponse.json({ movies: FALLBACK_MOVIES });
    }

    return NextResponse.json({ movies });
  } catch (error) {
    console.error('Ошибка загрузки фильмов из TMDB:', error);
    return NextResponse.json({ movies: query ? [] : FALLBACK_MOVIES });
  }
}
