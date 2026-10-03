const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// We add !h-[unset] to the Image className to override Next.js's injected height: 100%
const oldClass = 'className="block object-cover transition-transform duration-300"';
const newClass = 'className="block object-cover transition-transform duration-300 !h-[unset]"';
content = content.replace(new RegExp(oldClass.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\$&'), 'g'), newClass);

const oldClass2 = 'className="block w-full h-full object-cover transition-transform duration-300"';
const newClass2 = 'className="block w-full object-cover transition-transform duration-300 !h-[unset]"';
content = content.replace(new RegExp(oldClass2.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\$&'), 'g'), newClass2);

fs.writeFileSync('src/components/MovieCard.tsx', content);
