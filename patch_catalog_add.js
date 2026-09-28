const fs = require('fs');
let content = fs.readFileSync('src/components/ClientCatalog.tsx', 'utf8');

content = content.replace(
  '              className="bg-[#E50914] text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition-colors flex items-center gap-2 w-fit"',
  '              className="hidden md:flex bg-[#E50914] text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition-colors items-center gap-2 w-fit"'
);

fs.writeFileSync('src/components/ClientCatalog.tsx', content);
