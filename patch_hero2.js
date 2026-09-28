const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

const oldLogic = `  if (yearMatch) {
    year = yearMatch[0];
    displayTitle = displayTitle.replace(/\\s*[\\(\\[]?\\b(19\\d{2}|20\\d{2})\\b[\\)\\]]?\\s*/, ' ').trim();
  }`;

const newLogic = `  if (yearMatch) {
    const stripped = displayTitle.replace(/\\s*[\\(\\[]?\\b(19\\d{2}|20\\d{2})\\b[\\)\\]]?\\s*/, ' ').trim();
    if (stripped.length > 0) {
      year = yearMatch[0];
      displayTitle = stripped;
    }
  }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/Hero.tsx', content);
