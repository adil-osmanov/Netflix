const fs = require('fs');
let content = fs.readFileSync('src/components/MovieRow.tsx', 'utf8');

content = content.replace(
  '                  className="w-[45vw] sm:w-[30vw] md:w-[23vw] lg:w-[calc((100vw-8rem)/5)] aspect-video flex-shrink-0 flex flex-col items-center justify-center border border-zinc-700/50 bg-[#141414] text-zinc-500 hover:text-white hover:border-white hover:bg-zinc-800/50 cursor-pointer transition-all duration-300 rounded-md snap-center group shadow-md"',
  '                  className="hidden md:flex w-[45vw] sm:w-[30vw] md:w-[23vw] lg:w-[calc((100vw-8rem)/5)] aspect-video flex-shrink-0 flex-col items-center justify-center border border-zinc-700/50 bg-[#141414] text-zinc-500 hover:text-white hover:border-white hover:bg-zinc-800/50 cursor-pointer transition-all duration-300 rounded-md snap-center group shadow-md"'
);

fs.writeFileSync('src/components/MovieRow.tsx', content);
