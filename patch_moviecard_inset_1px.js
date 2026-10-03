const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldGrad = '<div className={`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-[#141414] from-10% via-[#141414]/80 via-50% to-transparent ${isHovered ? \'opacity-100\' : \'opacity-100 md:opacity-0\'}`} />';
const newGrad = '<div className={`absolute -inset-[1px] transition-opacity duration-300 bg-gradient-to-t from-[#141414] from-10% via-[#141414]/80 via-50% to-transparent ${isHovered ? \'opacity-100\' : \'opacity-100 md:opacity-0\'}`} />';
content = content.replaceAll(oldGrad, newGrad);

fs.writeFileSync('src/components/MovieCard.tsx', content);
