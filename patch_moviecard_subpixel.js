const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// The gradient divs
content = content.replace(
  /className={\`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t/g,
  'className={`absolute -inset-1 transition-opacity duration-300 bg-gradient-to-t'
);

fs.writeFileSync('src/components/MovieCard.tsx', content);
