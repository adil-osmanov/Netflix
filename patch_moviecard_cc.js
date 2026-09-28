const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// Add has_subtitles to interface
content = content.replace(
  'collection_type?: string;',
  'collection_type?: string;\n  has_subtitles?: boolean;'
);

// Add the badge to the hover state below the title
const oldHoverTitle = `          <h3 className="text-white font-bold text-sm md:text-base line-clamp-2 leading-tight drop-shadow-md">
            {movie.title}
          </h3>`;

const newHoverTitle = `          <h3 className="text-white font-bold text-sm md:text-base line-clamp-2 leading-tight drop-shadow-md flex items-center gap-2 flex-wrap">
            {movie.title}
            {movie.has_subtitles && (
              <span className="px-1 py-0.5 border border-zinc-400 text-zinc-300 text-[10px] rounded-[3px] font-bold tracking-wider leading-none shadow-sm">
                CC
              </span>
            )}
          </h3>`;

content = content.replace(oldHoverTitle, newHoverTitle);

fs.writeFileSync('src/components/MovieCard.tsx', content);
