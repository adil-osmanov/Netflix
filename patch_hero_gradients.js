const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

const oldGradients = `      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent" />`;

const newGradients = `      <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 md:from-[#141414] md:via-[#141414]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 md:via-[#141414]/20 to-transparent" />`;

content = content.replace(oldGradients, newGradients);
fs.writeFileSync('src/components/Hero.tsx', content);
