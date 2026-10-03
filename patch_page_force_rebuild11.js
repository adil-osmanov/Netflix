const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Ensure we append a fresh invalidation comment
content += '\n// Triggering Vercel rebuild for cache invalidation final revert\n';

fs.writeFileSync('src/app/page.tsx', content);
