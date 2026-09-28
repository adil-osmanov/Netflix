const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// 1. Update interface
content = content.replace(
  '  title: string;',
  '  title: string;\n  release_year?: string;'
);

// 2. Update render
const oldBottom = `            {movie.is_collection && collectionCount > 0 && (
              <p className="text-[#46d369] text-xs font-bold drop-shadow-md mt-1">
                {dynamicText}
              </p>
            )}`;

const newBottom = `            {(movie.release_year || (movie.is_collection && collectionCount > 0)) && (
              <div className="flex items-center gap-2 mt-1 drop-shadow-md">
                {movie.release_year && <span className="text-zinc-300 text-xs font-semibold border border-zinc-500 px-1 rounded-sm leading-none py-0.5">{movie.release_year}</span>}
                {movie.is_collection && collectionCount > 0 && (
                  <span className="text-[#46d369] text-xs font-bold">
                    {dynamicText}
                  </span>
                )}
              </div>
            )}`;

content = content.replace(oldBottom, newBottom);

fs.writeFileSync('src/components/MovieCard.tsx', content);
