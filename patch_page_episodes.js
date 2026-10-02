const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

const newCode = `  const { data: content } = await supabase.from('content').select('*').order('created_at', { ascending: false });
  const { data: allEpisodes } = await supabase.from('episodes').select('content_id, title');

  // Pre-calculate collection counts
  const collectionCounts: Record<string, { total: number, uniqueSeasons: number }> = {};
  if (allEpisodes) {
    allEpisodes.forEach(ep => {
      if (!collectionCounts[ep.content_id]) {
        collectionCounts[ep.content_id] = { total: 0, uniqueSeasons: 0 };
      }
      collectionCounts[ep.content_id].total += 1;
    });
    
    // Group by content_id to calculate unique seasons
    const epsByContent = allEpisodes.reduce((acc, ep) => {
      if (!acc[ep.content_id]) acc[ep.content_id] = [];
      acc[ep.content_id].push(ep);
      return acc;
    }, {} as Record<string, any[]>);
    
    for (const [contentId, eps] of Object.entries(epsByContent)) {
      const seasons = eps.map(ep => {
        try {
          const parsed = JSON.parse(ep.title);
          return parsed.season || 1;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      collectionCounts[contentId].uniqueSeasons = new Set(seasons).size;
    }
  }

  const allMovies = (content || []).map(item => {
    const counts = collectionCounts[item.id] || { total: 0, uniqueSeasons: 0 };
    return {
      id: item.id,
      title: item.title,
      release_year: item.release_year,
      description: "",
      category: categories?.find(c => c.id === genres?.find(g => g.id === item.genre_id)?.category_id)?.name || "",
      cover_url: item.poster_url,
      telegram_url: item.telegram_link,
      is_collection: item.is_collection,
      genre_id: item.genre_id,
      collection_type: item.collection_type,
      has_subtitles: item.has_subtitles,
      collectionCount: item.collection_type === 'series' ? counts.uniqueSeasons : counts.total,
      totalEpisodesCount: counts.total
    };
  });`;

content = content.replace(
  "  const { data: content } = await supabase.from('content').select('*').order('created_at', { ascending: false });\n\n  const allMovies = (content || []).map(item => ({\n    id: item.id,\n    title: item.title,\n    release_year: item.release_year,\n    description: \"\",\n    category: categories?.find(c => c.id === genres?.find(g => g.id === item.genre_id)?.category_id)?.name || \"\",\n    cover_url: item.poster_url,\n    telegram_url: item.telegram_link,\n    is_collection: item.is_collection,\n    genre_id: item.genre_id,\n    collection_type: item.collection_type,\n    has_subtitles: item.has_subtitles\n  }));",
  newCode
);

fs.writeFileSync('src/app/page.tsx', content);
