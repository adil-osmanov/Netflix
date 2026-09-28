const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// 1. Add WebkitMaskImage to the scaling container
const oldContainer = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`}";
const newContainer = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}";

content = content.replace(oldContainer, newContainer);

// 2. Make gradient stronger
const oldGradient = 'from-[#141414] from-15% via-[#141414]/80 via-45%';
const newGradient = 'from-[#141414] from-25% via-[#141414]/90 via-60%';

content = content.replace(new RegExp(oldGradient, 'g'), newGradient);

// 3. Just to be absolutely sure, add a 4px solid black bar at the very bottom of the card, hidden when not hovered.
// If the image is bleeding, this bar will sit exactly on the edge and block it.
// Actually, WebkitMaskImage fixes the bleed.

fs.writeFileSync('src/components/MovieCard.tsx', content);
