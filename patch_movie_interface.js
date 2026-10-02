const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

content = content.replace(
  '  has_subtitles?: boolean;\n}',
  '  has_subtitles?: boolean;\n  collectionCount?: number;\n  totalEpisodesCount?: number;\n}'
);

fs.writeFileSync('src/components/MovieCard.tsx', content);
