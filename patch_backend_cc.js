const fs = require('fs');
let content = fs.readFileSync('src/app/admin/add-content/actions.ts', 'utf8');

// 1. Parse has_subtitles
content = content.replace(
  'const release_year = formData.get(\'release_year\') as string || null;',
  'const release_year = formData.get(\'release_year\') as string || null;\n    const has_subtitles = formData.get(\'has_subtitles\') === \'true\';'
);

// 2. Add to payload
content = content.replace(
  '      telegram_link: messageId ? String(messageId) : null,\n    };',
  '      telegram_link: messageId ? String(messageId) : null,\n      has_subtitles,\n    };'
);

fs.writeFileSync('src/app/admin/add-content/actions.ts', content);
