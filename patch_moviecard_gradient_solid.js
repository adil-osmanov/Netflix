const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldGradient = /<div className={`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-\\[#141414\\] from-25% via-\\[#141414\\]\/90 via-60% to-transparent \\${isHovered \? 'opacity-100' : 'opacity-100 md:opacity-0'}`} \/>\n              {isHovered && <div className="absolute bottom-0 left-0 right-0 h-\\[2px\\] bg-\\[#141414\\] z-10" \/>} /g;

// We will replace the complex gradient with a bulletproof solid bottom + simple gradient.
// We make the solid block bleed down by 2px (-bottom-[2px]) just to cover any Safari container bleed.
const newGradient = `
              {/* Solid bottom portion to guarantee text readability and hide image bottom */}
              <div className={\`absolute -bottom-[2px] left-0 right-0 h-[35%] bg-[#141414] transition-opacity duration-300 \${isHovered ? 'opacity-100' : 'opacity-100 md:opacity-0'}\`} />
              {/* Fade portion above it */}
              <div className={\`absolute bottom-[calc(35%-2px)] left-0 right-0 h-[50%] transition-opacity duration-300 bg-gradient-to-t from-[#141414] to-transparent \${isHovered ? 'opacity-100' : 'opacity-100 md:opacity-0'}\`} />
`;

content = content.replace(
  '<div className={`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-[#141414] from-25% via-[#141414]/90 via-60% to-transparent ${isHovered ? \'opacity-100\' : \'opacity-100 md:opacity-0\'}`} />\n              {isHovered && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#141414] z-10" />}',
  newGradient.trim()
);
content = content.replace(
  '<div className={`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-[#141414] from-25% via-[#141414]/90 via-60% to-transparent ${isHovered ? \'opacity-100\' : \'opacity-100 md:opacity-0\'}`} />\n              {isHovered && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#141414] z-10" />}',
  newGradient.trim()
);

fs.writeFileSync('src/components/MovieCard.tsx', content);
