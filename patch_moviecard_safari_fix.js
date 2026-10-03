const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldScaling = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>";
const newScaling = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] isolate transform-gpu will-change-transform [-webkit-mask-image:-webkit-radial-gradient(white,black)] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`}>";

content = content.replace(oldScaling, newScaling);

fs.writeFileSync('src/components/MovieCard.tsx', content);
