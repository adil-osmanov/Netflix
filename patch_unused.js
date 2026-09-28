const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');
content = content.replace("import { unstable_noStore as noStore } from 'next/cache';\n", "");
fs.writeFileSync('src/app/page.tsx', content);
