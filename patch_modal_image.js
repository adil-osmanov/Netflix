const fs = require('fs');
let content = fs.readFileSync('src/components/CollectionViewerModal.tsx', 'utf8');

content = content.replace(
  'import { Play, X, ChevronDown, CheckCircle2 } from "lucide-react";',
  'import { Play, X, ChevronDown, CheckCircle2 } from "lucide-react";\nimport Image from "next/image";'
);

const oldImg = `<img src={movie.cover_url} alt={movie.title} className="w-full h-full object-cover" />`;
const newImg = `<Image src={movie.cover_url} alt={movie.title} fill sizes="(max-width: 1024px) 100vw, 950px" className="object-cover" />`;

content = content.replace(oldImg, newImg);

fs.writeFileSync('src/components/CollectionViewerModal.tsx', content);
