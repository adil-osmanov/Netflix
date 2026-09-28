const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// We want newest first, so order by created_at DESC
content = content.replace(
  "const { data: content } = await supabase.from('content').select('*');",
  "const { data: content } = await supabase.from('content').select('*').order('created_at', { ascending: false });"
);

// We no longer need reverse() because the DB is returning them correctly
content = content.replace(
  "  })).reverse();",
  "  }));"
);

fs.writeFileSync('src/app/page.tsx', content);

let actionsContent = fs.readFileSync('src/app/actions.ts', 'utf8');
actionsContent = actionsContent.replace(
  "      .select('*');",
  "      .select('*')\n      .order('created_at', { ascending: false });"
);
fs.writeFileSync('src/app/actions.ts', actionsContent);
