const fs = require('fs');
let content = fs.readFileSync('src/app/actions.ts', 'utf8');

content = content.replace(
  'collection_type: item.collection_type',
  'collection_type: item.collection_type,\n      has_subtitles: item.has_subtitles'
);

fs.writeFileSync('src/app/actions.ts', content);
