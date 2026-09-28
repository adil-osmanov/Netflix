const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

content = content.replace(
  "const { data: content } = await supabase.from('content').select('*');",
  "const { data: content } = await supabase.from('content').select('*').order('created_at', { ascending: false });"
);

content = content.replace(
  "  })).reverse();",
  "  }));"
);

fs.writeFileSync('src/app/page.tsx', content);
