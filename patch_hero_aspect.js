const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

content = content.replace(
  'w-full aspect-[4/3] md:aspect-auto',
  'w-full aspect-[16/9] sm:aspect-[4/3] md:aspect-auto'
);

// Tweak the top padding of the content so it sits perfectly below the 16:9 image on mobile
content = content.replace(
  'pt-[50vw] md:pt-0',
  'pt-[45vw] sm:pt-[50vw] md:pt-0'
);

fs.writeFileSync('src/components/Hero.tsx', content);
