const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

content = content.replace(
  "export default async function Home() {",
  "// Triggering Vercel rebuild for cache invalidation\nexport default async function Home() {"
);

fs.writeFileSync('src/app/page.tsx', content);
