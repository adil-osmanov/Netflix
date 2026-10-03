const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldInnerDiv = '<div onClick={handlePlay} className="absolute inset-0 z-0 cursor-pointer">';
const newInnerDiv = '<div onClick={handlePlay} className="absolute inset-0 z-0 cursor-pointer overflow-hidden rounded-md">';
content = content.replace(oldInnerDiv, newInnerDiv);

const oldInnerA = 'className="absolute inset-0 z-0 cursor-pointer block"';
const newInnerA = 'className="absolute inset-0 z-0 cursor-pointer block overflow-hidden rounded-md"';
content = content.replace(oldInnerA, newInnerA);

fs.writeFileSync('src/components/MovieCard.tsx', content);
