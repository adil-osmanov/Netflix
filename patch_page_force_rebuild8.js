const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

content = content.replace(
  "// Triggering Vercel rebuild for cache invalidation option 2",
  "// Triggering Vercel rebuild for cache invalidation option 3"
);

fs.writeFileSync('src/app/page.tsx', content);
