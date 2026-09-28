const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldGradient = 'bg-gradient-to-t from-[#141414] from-15% via-[#141414]/80 via-45% to-transparent';
const newGradient = 'bg-gradient-to-t from-[#141414] from-30% via-[#141414]/90 via-70% to-transparent';

content = content.replace(new RegExp(oldGradient, 'g'), newGradient);

fs.writeFileSync('src/components/MovieCard.tsx', content);
