const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldYearBlock = `            {(movie.release_year || (movie.is_collection && collectionCount > 0)) && (
              <div className="flex items-center gap-2 mt-1 drop-shadow-md">
                {movie.release_year && <span className="text-zinc-300 text-[10px] md:text-xs font-semibold border border-zinc-500 px-1 rounded-sm leading-none py-0.5">{movie.release_year}</span>}
                {movie.is_collection && collectionCount > 0 && (
                  <span className="text-[#46d369] text-[10px] md:text-xs font-bold">
                    {dynamicText}
                  </span>
                )}
              </div>
            )}`;

const newYearBlock = `            {(movie.release_year || (movie.is_collection && collectionCount > 0) || movie.has_subtitles) && (
              <div className="flex items-center gap-2 mt-1 drop-shadow-md">
                {movie.release_year && <span className="text-zinc-300 text-[10px] md:text-xs font-semibold border border-zinc-500 px-1 rounded-sm leading-none py-0.5">{movie.release_year}</span>}
                {movie.is_collection && collectionCount > 0 && (
                  <span className="text-[#46d369] text-[10px] md:text-xs font-bold">
                    {dynamicText}
                  </span>
                )}
                {movie.has_subtitles && (
                  <span className="px-1 py-0.5 border border-zinc-400 text-zinc-300 text-[9px] md:text-[10px] rounded-[3px] font-bold tracking-wider leading-none shadow-sm flex items-center justify-center">
                    CC
                  </span>
                )}
              </div>
            )}`;

content = content.replace(oldYearBlock, newYearBlock);
fs.writeFileSync('src/components/MovieCard.tsx', content);
