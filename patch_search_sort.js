const fs = require('fs');
let content = fs.readFileSync('src/app/actions.ts', 'utf8');

content = content.replace(
  "      .select('*');",
  "      .select('*')\n      .order('created_at', { ascending: false });"
);

fs.writeFileSync('src/app/actions.ts', content);
