const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

const oldMetadataRow = `        {/* Real Netflix Style Metadata Row */}
        {(year || partsInfo) && (
          <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-base font-semibold mb-3 md:mb-6 drop-shadow-md">
            {year && <span className="text-zinc-300">{year}</span>}
            {partsInfo && <span className="text-zinc-300">{partsInfo}</span>}
          </div>
        )}`;

const newMetadataRow = `        {/* Real Netflix Style Metadata Row */}
        {(year || partsInfo || displayMovie.has_subtitles) && (
          <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-base font-semibold mb-3 md:mb-6 drop-shadow-md">
            {year && <span className="text-zinc-300">{year}</span>}
            {partsInfo && <span className="text-zinc-300">{partsInfo}</span>}
            {displayMovie.has_subtitles && (
              <span className="px-1.5 py-0.5 border border-zinc-400 text-zinc-300 text-[9px] md:text-xs rounded-[3px] font-bold tracking-wider leading-none shadow-sm flex items-center justify-center">
                CC
              </span>
            )}
          </div>
        )}`;

content = content.replace(oldMetadataRow, newMetadataRow);

fs.writeFileSync('src/components/Hero.tsx', content);
