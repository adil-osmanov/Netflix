import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '844dba0bfd8f3a4f3799f6130ef9e335';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID не указан' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&language=ru-RU`,
      { next: { revalidate: 86400 } } // Кэшируем на 24 часа
    );

    if (!res.ok) throw new Error('Ошибка запроса деталей сериала к TMDB');

    const data = await res.json();

    // Фильтруем нулевые сезоны (спецвыпуски/бонусы) и забираем только основные сезоны с реальным количеством серий
    const seasons = (data.seasons || [])
      .filter((s: any) => s.season_number > 0 && s.episode_count > 0)
      .map((s: any) => ({
        seasonNumber: s.season_number,
        name: s.name || `Сезон ${s.season_number}`,
        episodeCount: s.episode_count,
      }));

    return NextResponse.json({
      id: data.id,
      name: data.name,
      numberOfSeasons: data.number_of_seasons || seasons.length || 1,
      seasons: seasons.length > 0 ? seasons : [{ seasonNumber: 1, name: 'Сезон 1', episodeCount: 10 }],
    });
  } catch (error) {
    console.error('TV Details API Error:', error);
    return NextResponse.json({
      id,
      numberOfSeasons: 1,
      seasons: [{ seasonNumber: 1, name: 'Сезон 1', episodeCount: 10 }],
    });
  }
}
