const fs = require('fs');
let content = fs.readFileSync('next.config.ts', 'utf8');

content = content.replace(
  '  experimental: {',
  '  images:\n  {\n    remotePatterns: [\n      { protocol: "https", hostname: "**" },\n      { protocol: "http", hostname: "**" }\n    ]\n  },\n  experimental: {'
);

fs.writeFileSync('next.config.ts', content);
