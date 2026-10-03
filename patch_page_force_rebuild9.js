const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

content = content.replace(
  "// Triggering Vercel rebuild for cache invalidation option 3",
  "// Triggering Vercel rebuild for cache invalidation image crop"
);

fs.writeFileSync('src/app/page.tsx', content);
