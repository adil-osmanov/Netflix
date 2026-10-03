const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

content = content.replace(
  'import { Play, CheckCircle2 } from "lucide-react";',
  'import { Play, CheckCircle2 } from "lucide-react";\nimport Image from "next/image";'
);

const oldHero = `    <div 
      className="relative w-full aspect-[16/9] md:aspect-auto md:h-[75vh] md:max-h-[850px] flex flex-col justify-end pb-4 md:pb-16 z-10 bg-[#141414] bg-top bg-no-repeat bg-contain md:bg-cover"
      style={{ backgroundImage: \`url(\${displayMovie.cover_url})\` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 md:from-[#141414] md:via-[#141414]/50 to-transparent" />`;

const newHero = `    <div 
      className="relative w-full aspect-[16/9] md:aspect-auto md:h-[75vh] md:max-h-[850px] flex flex-col justify-end pb-4 md:pb-16 z-10 bg-[#141414]"
    >
      <Image 
        src={displayMovie.cover_url} 
        alt={displayMovie.title} 
        fill
        priority
        className="object-cover object-top"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 md:from-[#141414] md:via-[#141414]/50 to-transparent z-10" />`;

content = content.replace(oldHero, newHero);

// We need to also fix the other gradient to have z-10 so it's above the image!
const oldGrad = `<div className="absolute inset-0 bg-gradient-to-t from-[#141414] from-10% via-[#141414]/80 md:via-[#141414]/40 via-60% to-transparent" />`;
const newGrad = `<div className="absolute inset-0 bg-gradient-to-t from-[#141414] from-10% via-[#141414]/80 md:via-[#141414]/40 via-60% to-transparent z-10" />`;
content = content.replace(oldGrad, newGrad);

// The main content container needs z-20 so it sits above the gradients!
const oldContent = `<div className="relative px-4 md:px-14 w-full md:w-[60%] lg:w-[50%] pt-20 md:pt-0">`;
const newContent = `<div className="relative px-4 md:px-14 w-full md:w-[60%] lg:w-[50%] pt-20 md:pt-0 z-20">`;
content = content.replace(oldContent, newContent);

fs.writeFileSync('src/components/Hero.tsx', content);
