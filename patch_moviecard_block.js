const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldImgClass = 'className="object-cover transition-transform duration-300"';
const newImgClass = 'className="block object-cover transition-transform duration-300"';
content = content.replaceAll(oldImgClass, newImgClass);

fs.writeFileSync('src/components/MovieCard.tsx', content);
