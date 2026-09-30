const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

content = content.replace(
  '        draggable={true}',
  '        draggable={!hideAdmin}'
);

fs.writeFileSync('src/components/MovieCard.tsx', content);
