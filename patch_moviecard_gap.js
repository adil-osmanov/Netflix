const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// 1. Add block to Image tags
content = content.replace(
  /className="w-full h-full object-cover transition-transform duration-300"/g,
  'className="block w-full h-full object-cover transition-transform duration-300"'
);
content = content.replace(
  /className="object-cover transition-transform duration-300"/g,
  'className="block object-cover transition-transform duration-300"'
);

// 2. Add bg-[#141414] and rounded-md to the outer parent wrapper to prevent subpixel background leaks
const oldOuter = "className={`group relative w-full aspect-video flex-shrink-0 transition-z duration-0 ${isHovered ? 'z-[70]' : isAnimatingOut ? 'z-[60]' : 'z-10'}`}";
const newOuter = "className={`group relative w-full aspect-video flex-shrink-0 transition-z duration-0 bg-[#141414] rounded-md ${isHovered ? 'z-[70]' : isAnimatingOut ? 'z-[60]' : 'z-10'}`}";
content = content.replace(oldOuter, newOuter);

// 3. To be absolutely safe, let's make the scaling container have a microscopic dark border
const oldScaling = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>";
const newScaling = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] border border-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)', transform: 'translateZ(0)' }}>";
content = content.replace(oldScaling, newScaling);


fs.writeFileSync('src/components/MovieCard.tsx', content);
