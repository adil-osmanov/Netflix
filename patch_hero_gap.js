const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

const oldHeroStart = `    <div className="relative w-full min-h-[55vh] sm:min-h-[65vh] md:min-h-[75vh] flex flex-col justify-end pt-[45vw] sm:pt-[50vw] md:pt-0 pb-8 md:pb-16 z-10 bg-[#141414]">`;
const newHeroStart = `    <div className="relative w-full flex flex-col pt-[50vw] sm:pt-[55vw] md:pt-0 md:justify-end md:min-h-[75vh] pb-4 md:pb-16 z-10 bg-[#141414]">`;

content = content.replace(oldHeroStart, newHeroStart);

// Also remove the -mt-10 from the content container because we don't need it if we flow naturally
content = content.replace(
  '      <div className="relative z-20 px-4 md:px-12 lg:px-16 max-w-3xl -mt-10 md:mt-0">',
  '      <div className="relative z-20 px-4 md:px-12 lg:px-16 max-w-3xl">'
);

fs.writeFileSync('src/components/Hero.tsx', content);
