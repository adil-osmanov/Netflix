const fs = require('fs');
let content = fs.readFileSync('src/components/CollectionViewerModal.tsx', 'utf8');

const getDisplayNameFunc = `
  const getDisplayName = (title: string, idx: number) => {
    const s = \`Серия \${idx + 1}\`;
    const p = \`Часть \${idx + 1}\`;
    if (title === s) return "Серия";
    if (title === p) return "Часть";
    return title;
  };`;

content = content.replace(
  '  const getEpisodeLink = (ep: any) => {',
  getDisplayNameFunc + '\n  const getEpisodeLink = (ep: any) => {'
);

content = content.replace(
  '<span className="text-white font-bold text-lg">{ep.parsedTitle}</span>',
  '<span className="text-white font-bold text-lg">{getDisplayName(ep.parsedTitle, idx)}</span>'
);

fs.writeFileSync('src/components/CollectionViewerModal.tsx', content);
