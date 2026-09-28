const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

content = content.replace(
  'import ClientCatalog from "@/components/ClientCatalog";',
  'import ClientCatalog from "@/components/ClientCatalog";\nimport { Suspense } from "react";'
);

content = content.replace(
  '      <ClientCatalog \n        allGenres={genres || []} \n        allMovies={allMovies} \n        allCategories={categories || []} \n      />',
  '      <Suspense fallback={<div className="min-h-screen w-full bg-[#141414]" />}>\n        <ClientCatalog \n          allGenres={genres || []} \n          allMovies={allMovies} \n          allCategories={categories || []} \n        />\n      </Suspense>'
);

fs.writeFileSync('src/app/page.tsx', content);
