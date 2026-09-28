const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

content = content.replace(
  "const { data: content } = await supabase.from('content').select('*').order('created_at', { ascending: false });",
  "const { data: content } = await supabase.from('content').select('*');"
);

content = content.replace(
  "  }));",
  "  })).reverse();"
);

fs.writeFileSync('src/app/page.tsx', content);

let actionsContent = fs.readFileSync('src/app/actions.ts', 'utf8');
actionsContent = actionsContent.replace(
  "      .select('*')\n      .order('created_at', { ascending: false });",
  "      .select('*');"
);
fs.writeFileSync('src/app/actions.ts', actionsContent);
