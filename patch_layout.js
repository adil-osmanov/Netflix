const fs = require('fs');
let content = fs.readFileSync('src/app/layout.tsx', 'utf8');

content = content.replace(
  'import { SearchProvider } from "@/components/SearchContext";',
  'import { SearchProvider } from "@/components/SearchContext";\nimport { WatchedProvider } from "@/context/WatchedContext";'
);

content = content.replace(
  '<SearchProvider>{children}</SearchProvider>',
  '<WatchedProvider>\n          <SearchProvider>{children}</SearchProvider>\n        </WatchedProvider>'
);

fs.writeFileSync('src/app/layout.tsx', content);
