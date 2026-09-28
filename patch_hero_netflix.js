const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

// Replace the current container class
const oldClass = 'className="relative w-full aspect-[16/9] md:aspect-video flex flex-col justify-end pb-4 md:pb-16 z-10 bg-[#141414] bg-top md:bg-center bg-no-repeat bg-contain"';

const newClass = 'className="relative w-full aspect-[16/9] md:aspect-auto md:h-[75vh] md:max-h-[850px] flex flex-col justify-end pb-4 md:pb-16 z-10 bg-[#141414] bg-top bg-no-repeat bg-contain md:bg-cover"';

content = content.replace(oldClass, newClass);
fs.writeFileSync('src/components/Hero.tsx', content);
