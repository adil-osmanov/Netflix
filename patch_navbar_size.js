const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

content = content.replace(
  '  const linkBaseClass = "text-[11px] md:text-[14px] whitespace-nowrap transition-colors cursor-pointer";',
  '  const linkBaseClass = "text-base md:text-[14px] whitespace-nowrap transition-colors cursor-pointer";'
);

fs.writeFileSync('src/components/Navbar.tsx', content);
