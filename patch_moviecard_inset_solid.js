const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

content = content.replace(
  'shadow-[inset_0_-10px_10px_-5px_#141414]',
  'shadow-[inset_0_-4px_0_0_#141414]'
);
content = content.replace(
  'shadow-[inset_0_-10px_10px_-5px_#141414]',
  'shadow-[inset_0_-4px_0_0_#141414]'
);

fs.writeFileSync('src/components/MovieCard.tsx', content);
