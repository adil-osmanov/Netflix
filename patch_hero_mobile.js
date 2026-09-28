const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

// 1. Min height & padding
content = content.replace(
  '      className="relative w-full min-h-[75vh] flex flex-col justify-end pb-16 z-10 bg-[#141414]"',
  '      className="relative w-full min-h-[60vh] md:min-h-[75vh] flex flex-col justify-end pb-8 md:pb-16 z-10 bg-[#141414]"'
);

content = content.replace(
  '      <div className="relative z-20 px-10 md:px-16 max-w-3xl">',
  '      <div className="relative z-20 px-4 md:px-12 lg:px-16 max-w-3xl">'
);

// 2. Title size
content = content.replace(
  '        <h1 className="text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 drop-shadow-2xl">',
  '        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-3 md:mb-6 drop-shadow-2xl">'
);

// 3. Metadata Row spacing
content = content.replace(
  '          <div className="flex items-center gap-3 md:gap-4 text-sm md:text-base font-semibold mb-6 drop-shadow-md">',
  '          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-base font-semibold mb-4 md:mb-6 drop-shadow-md">'
);

// 4. Description text size & spacing
content = content.replace(
  '          <p className="text-lg text-zinc-200 mb-10 line-clamp-3 md:line-clamp-4 max-w-2xl leading-snug drop-shadow-lg">',
  '          <p className="text-sm md:text-lg text-zinc-200 mb-6 md:mb-10 line-clamp-3 md:line-clamp-4 max-w-2xl leading-snug drop-shadow-lg">'
);

content = content.replace(
  '        {!displayMovie.description && <div className="mb-10" />}',
  '        {!displayMovie.description && <div className="mb-6 md:mb-10" />}'
);

// 5. Button size
content = content.replace(
  '            className="bg-white text-black font-bold text-lg px-8 py-3 rounded-md flex items-center gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"',
  '            className="bg-white text-black font-bold text-sm md:text-lg px-4 md:px-8 py-2 md:py-3 rounded-md flex items-center gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"'
);

content = content.replace(
  '            <Play className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" />',
  '            <Play className="w-5 h-5 md:w-7 md:h-7" fill="currentColor" />'
);

fs.writeFileSync('src/components/Hero.tsx', content);
