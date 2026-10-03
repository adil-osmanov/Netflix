const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldGradient1 = '<div className={`absolute -inset-1 transition-opacity duration-300 bg-gradient-to-t from-[#141414] from-15% via-[#141414]/80 via-45% to-transparent ${isHovered ? \'opacity-100\' : \'opacity-100 md:opacity-0\'}`} />';
const newGradient1 = '<div className={`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-[#141414] from-25% via-[#141414]/90 via-60% to-transparent ${isHovered ? \'opacity-100\' : \'opacity-100 md:opacity-0\'}`} />\n              {isHovered && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#141414] z-10" />}';

content = content.replaceAll(oldGradient1, newGradient1);

fs.writeFileSync('src/components/MovieCard.tsx', content);
