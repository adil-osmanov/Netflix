const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// The ultimate fix: an INSET box shadow on a pseudo element overlay that sits ON TOP of the image.
// We remove the ring and add a custom inner shadow overlay.
const oldWrapper = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ring-1 ring-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>";
const newWrapper = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)', transform: 'translateZ(0)' }}>";

content = content.replace(oldWrapper, newWrapper);

// For the inner a/div that wraps the Image, we add an overlay div inside it that has a massive INSET shadow at the bottom.
const innerDivOverlay = `
              {/* Massive inset shadow to guarantee the bottom edge is pure black from the inside */}
              <div className="absolute inset-0 pointer-events-none rounded-md shadow-[inset_0_-10px_10px_-5px_#141414] z-10" />
`;

content = content.replace(
  '<Image src={movie.cover_url} alt={movie.title} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="object-cover rounded-md transition-transform duration-300" />\n              {/* Solid bottom portion',
  `<Image src={movie.cover_url} alt={movie.title} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="object-cover rounded-md transition-transform duration-300" />\n              ${innerDivOverlay.trim()}\n              {/* Solid bottom portion`
);

content = content.replace(
  '<Image src={movie.cover_url} alt={movie.title} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="object-cover rounded-md transition-transform duration-300" />\n              {/* Solid bottom portion',
  `<Image src={movie.cover_url} alt={movie.title} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="object-cover rounded-md transition-transform duration-300" />\n              ${innerDivOverlay.trim()}\n              {/* Solid bottom portion`
);


fs.writeFileSync('src/components/MovieCard.tsx', content);
