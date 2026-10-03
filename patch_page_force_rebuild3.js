const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

content = content.replace(
  "// Triggering Vercel rebuild for cache invalidation 3",
  "// Triggering Vercel rebuild for cache invalidation 4"
);

fs.writeFileSync('src/app/page.tsx', content);
