const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// 1. Remove the 1.02 scale from the image
const oldImg = 'className="object-cover scale-[1.02] transition-transform duration-300"';
const newImg = 'className="object-cover transition-transform duration-300"';
content = content.replaceAll(oldImg, newImg);

// 2. Change the gradient from -inset-1 to inset-0 and make the gradient smoother
const oldGrad = '<div className={`absolute -inset-1 transition-opacity duration-300 bg-gradient-to-t from-[#141414] from-15% via-[#141414]/80 via-45% to-transparent ${isHovered ? \'opacity-100\' : \'opacity-100 md:opacity-0\'}`} />';
const newGrad = '<div className={`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-[#141414] from-10% via-[#141414]/80 via-50% to-transparent ${isHovered ? \'opacity-100\' : \'opacity-100 md:opacity-0\'}`} />';
content = content.replaceAll(oldGrad, newGrad);

// 3. Make sure the outer container has a dark background just in case
const oldOuter = "className={`group relative w-full aspect-video flex-shrink-0 transition-z duration-0 ${isHovered ? 'z-[70]' : isAnimatingOut ? 'z-[60]' : 'z-10'}`}";
const newOuter = "className={`group relative w-full aspect-video flex-shrink-0 transition-z duration-0 bg-[#141414] rounded-md ${isHovered ? 'z-[70]' : isAnimatingOut ? 'z-[60]' : 'z-10'}`}";
content = content.replace(oldOuter, newOuter);

// 4. Ensure scaling container has absolute inset-0 and no weird hacks
const oldScaling = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>";
const newScaling = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>";
content = content.replace(oldScaling, newScaling);

fs.writeFileSync('src/components/MovieCard.tsx', content);
