const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// 1. Adjust links spacing for mobile
content = content.replace(
  '          <div className="flex gap-4 md:gap-5 ml-8 md:ml-10">',
  '          <div className="flex gap-3 md:gap-5 ml-4 md:ml-10 overflow-x-auto no-scrollbar">'
);

// 2. Adjust link size
content = content.replace(
  '  const linkBaseClass = "text-[12px] md:text-[14px] transition-colors cursor-pointer";',
  '  const linkBaseClass = "text-[11px] md:text-[14px] whitespace-nowrap transition-colors cursor-pointer";'
);

// 3. Adjust logo size
content = content.replace(
  '          <Link href="/?category=all" onClick={() => setSearchTerm(\'\')} className="text-2xl md:text-3xl font-bold text-[#E50914] cursor-pointer" style={{ fontFamily: \'Arial, sans-serif\' }}>',
  '          <Link href="/?category=all" onClick={() => setSearchTerm(\'\')} className="text-xl md:text-3xl font-bold text-[#E50914] cursor-pointer flex-shrink-0" style={{ fontFamily: \'Arial, sans-serif\' }}>'
);

// 4. Adjust search input width on mobile
content = content.replace(
  "              showSearch ? 'w-48 md:w-64 border-b border-white pb-1' : 'w-6 border-b border-transparent pb-1'",
  "              showSearch ? 'w-32 sm:w-48 md:w-64 border-b border-white pb-1' : 'w-5 md:w-6 border-b border-transparent pb-1'"
);

content = content.replace(
  '              className="w-5 h-5 md:w-6 md:h-6 text-white cursor-pointer flex-shrink-0 font-bold"',
  '              className="w-4 h-4 md:w-6 md:h-6 text-white cursor-pointer flex-shrink-0 font-bold"'
);

content = content.replace(
  "              className={`bg-transparent outline-none text-white text-[14px] ml-2 placeholder:text-gray-500 transition-opacity duration-500 ${",
  "              className={`bg-transparent outline-none text-white text-[12px] md:text-[14px] ml-1 md:ml-2 placeholder:text-gray-500 transition-opacity duration-500 ${"
);

fs.writeFileSync('src/components/Navbar.tsx', content);
