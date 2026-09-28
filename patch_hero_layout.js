const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

content = content.replace(
  '      className="relative w-full aspect-[16/9] sm:aspect-video md:aspect-auto md:min-h-[75vh] flex flex-col justify-end pb-4 md:pb-16 z-10 bg-[#141414] bg-top md:bg-center bg-no-repeat bg-contain md:bg-cover"',
  '      className="relative w-full aspect-[16/9] md:aspect-video flex flex-col justify-end pb-4 md:pb-16 z-10 bg-[#141414] bg-top md:bg-center bg-no-repeat bg-contain md:bg-cover"'
);

fs.writeFileSync('src/components/Hero.tsx', content);
