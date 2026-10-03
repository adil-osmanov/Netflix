const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// Remove the hacky inner div overlay with inset shadow
const innerDivOverlay = '{/* Massive inset shadow to guarantee the bottom edge is pure black from the inside */}\n              <div className="absolute inset-0 pointer-events-none rounded-md shadow-[inset_0_-4px_0_0_#141414] z-10" />';
content = content.replace(innerDivOverlay, '');
content = content.replace(innerDivOverlay, '');

// Replace the two hacky overlays with a single inline-styled gradient overlay
const oldOverlays = `
              {/* Solid bottom portion to guarantee text readability and hide image bottom */}
              <div className={\`absolute -bottom-[2px] left-0 right-0 h-[35%] bg-[#141414] transition-opacity duration-300 \${isHovered ? 'opacity-100' : 'opacity-100 md:opacity-0'}\`} />
              {/* Fade portion above it */}
              <div className={\`absolute bottom-[calc(35%-2px)] left-0 right-0 h-[50%] transition-opacity duration-300 bg-gradient-to-t from-[#141414] to-transparent \${isHovered ? 'opacity-100' : 'opacity-100 md:opacity-0'}\`} />
`;

const pristineOverlay = `
              <div 
                className={\`absolute inset-0 pointer-events-none transition-opacity duration-300 \${isHovered ? 'opacity-100' : 'opacity-100 md:opacity-0'}\`}
                style={{
                  background: 'linear-gradient(to top, #141414 0%, #141414 25%, rgba(20,20,20,0.8) 50%, transparent 100%)',
                  boxShadow: 'inset 0 -2px 0 0 #141414'
                }}
              />
`;

content = content.replaceAll(oldOverlays.trim(), pristineOverlay.trim());

// Restore the clean outer wrapper (remove ring-1 and translateZ since they might be causing Safari bugs)
const outerWrapperBad = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ring-1 ring-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>";
const outerWrapperGood = "className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] border border-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)', transform: 'translateZ(0)' }}>";
content = content.replace(outerWrapperBad, outerWrapperGood);


// The inner wrapper should NOT have overflow-hidden rounded-md because it was a hack and might be causing issues.
const innerWrapperBad = '<div onClick={handlePlay} className="absolute inset-0 z-0 cursor-pointer overflow-hidden rounded-md">';
const innerWrapperGood = '<div onClick={handlePlay} className="absolute inset-0 z-0 cursor-pointer">';
content = content.replace(innerWrapperBad, innerWrapperGood);

const innerWrapperABad = 'className="absolute inset-0 z-0 cursor-pointer block overflow-hidden rounded-md"';
const innerWrapperAGood = 'className="absolute inset-0 z-0 cursor-pointer block"';
content = content.replace(innerWrapperABad, innerWrapperAGood);


fs.writeFileSync('src/components/MovieCard.tsx', content);
