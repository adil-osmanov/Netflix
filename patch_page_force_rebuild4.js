const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

content = content.replace(
  "// Triggering Vercel rebuild for cache invalidation revert",
  "// Triggering Vercel rebuild for cache invalidation user fix"
);

fs.writeFileSync('src/app/page.tsx', content);
