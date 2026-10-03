const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

if (content.includes('// Triggering Vercel rebuild for cache invalidation 2')) {
  content = content.replace('// Triggering Vercel rebuild for cache invalidation 2', '// Triggering Vercel rebuild for cache invalidation 3');
} else {
  content = content.replace(
    "// Triggering Vercel rebuild for cache invalidation",
    "// Triggering Vercel rebuild for cache invalidation 2"
  );
}

fs.writeFileSync('src/app/page.tsx', content);
