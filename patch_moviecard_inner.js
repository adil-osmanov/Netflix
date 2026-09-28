const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

content = content.replace(
  '  const CardInner = () => (',
  '  const cardInner = ('
);

content = content.replace(
  '<CardInner />',
  '{cardInner}'
);
content = content.replace(
  '<CardInner />',
  '{cardInner}'
);

fs.writeFileSync('src/components/MovieCard.tsx', content);
