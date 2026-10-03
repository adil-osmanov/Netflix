const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldImg = 'className="block object-cover transition-transform duration-300"';
const newImg = 'className="block object-cover scale-[1.01] transition-transform duration-300"';
content = content.replaceAll(oldImg, newImg);

fs.writeFileSync('src/components/MovieCard.tsx', content);
