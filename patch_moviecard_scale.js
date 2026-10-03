const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldImg = '<Image src={movie.cover_url} alt={movie.title} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="object-cover transition-transform duration-300" />';
const newImg = '<Image src={movie.cover_url} alt={movie.title} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="object-cover scale-[1.02] transition-transform duration-300" />';

content = content.replaceAll(oldImg, newImg);

fs.writeFileSync('src/components/MovieCard.tsx', content);
