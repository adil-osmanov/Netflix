const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldImg = 'className="object-cover transition-transform duration-300"';
const newImg = 'className="object-cover rounded-md transition-transform duration-300"';
content = content.replaceAll(oldImg, newImg);

fs.writeFileSync('src/components/MovieCard.tsx', content);
