const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

const oldGradient = 'bg-gradient-to-t from-[#141414] from-5% via-[#141414]/60 md:via-[#141414]/20 to-transparent';
const newGradient = 'bg-gradient-to-t from-[#141414] from-10% via-[#141414]/80 md:via-[#141414]/40 via-60% to-transparent';

content = content.replace(oldGradient, newGradient);

fs.writeFileSync('src/components/Hero.tsx', content);
