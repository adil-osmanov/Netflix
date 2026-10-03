const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

content = content.replace(
  'import { Play, Pencil, Trash2, CheckCircle2 } from "lucide-react";',
  'import { Play, Pencil, Trash2, CheckCircle2 } from "lucide-react";\nimport Image from "next/image";'
);

const oldImg = `<img src={movie.cover_url} alt={movie.title} className="w-full h-full object-cover transition-transform duration-300" />`;
const newImg = `<Image src={movie.cover_url} alt={movie.title} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="object-cover transition-transform duration-300" />`;

// We use regex globally in case there are multiple img tags
content = content.replace(new RegExp(oldImg.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\$&'), 'g'), newImg);

fs.writeFileSync('src/components/MovieCard.tsx', content);
