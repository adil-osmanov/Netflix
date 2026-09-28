const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

const oldLogic = `  let displayTitle = displayMovie.title;
  let year = null;
  const yearMatch = displayTitle.match(/\\b(19\\d{2}|20\\d{2})\\b/);
  
  if (yearMatch) {
    const stripped = displayTitle.replace(/\\s*[\\(\\[]?\\b(19\\d{2}|20\\d{2})\\b[\\)\\]]?\\s*/, ' ').trim();
    if (stripped.length > 0) {
      year = yearMatch[0];
      displayTitle = stripped;
    }
  }`;

const newLogic = `  let displayTitle = displayMovie.title;
  let year = displayMovie.release_year;`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/Hero.tsx', content);
