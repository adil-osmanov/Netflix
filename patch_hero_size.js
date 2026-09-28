const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

// Use top center for background to avoid cropping heads
content = content.replace(
  '        backgroundPosition: \'center\'',
  '        backgroundPosition: \'top center\''
);

// Use a better aspect ratio for mobile hero so it doesn't take 100% of vertical space and push everything down awkwardly.
// 60vh is quite tall. Let's try 55vh.
content = content.replace(
  '      className="relative w-full min-h-[60vh] md:min-h-[75vh] flex flex-col justify-end pb-8 md:pb-16 z-10 bg-[#141414]"',
  '      className="relative w-full min-h-[55vh] md:min-h-[75vh] flex flex-col justify-end pb-8 md:pb-16 z-10 bg-[#141414]"'
);

fs.writeFileSync('src/components/Hero.tsx', content);
