const fs = require('fs');
let content = fs.readFileSync('src/components/ClientCatalog.tsx', 'utf8');

// For the Genre grid
content = content.replace(
  '      <div className="pb-40 relative z-20 mt-4 space-y-8 md:space-y-12">',
  '      <div className="pb-40 relative z-20 mt-2 md:mt-4 space-y-4 md:space-y-12">'
);

// For the Flat grid
content = content.replace(
  '        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-x-2 gap-y-4 md:gap-y-8">',
  '        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-x-2 gap-y-2 md:gap-y-8">'
);

fs.writeFileSync('src/components/ClientCatalog.tsx', content);
