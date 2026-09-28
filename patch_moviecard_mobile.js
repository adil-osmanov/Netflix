const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// Gradient
content = content.replace(
  '          <div className={`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-black/95 via-black/30 to-transparent ${isHovered ? \'opacity-100\' : \'opacity-0\'}`} />',
  '          <div className={`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-black/95 via-black/30 to-transparent ${isHovered ? \'opacity-100\' : \'opacity-100 md:opacity-0\'}`} />'
);

// Actions (Edit/Delete) - always visible on mobile if admin? Or keep it hover?
content = content.replace(
  '          <div className={`absolute top-3 right-3 flex gap-2 transition-all duration-300 ${isHovered ? \'opacity-100 translate-y-0\' : \'opacity-0 -translate-y-2\'}`}>',
  '          <div className={`absolute top-2 right-2 md:top-3 md:right-3 flex gap-2 transition-all duration-300 ${isHovered ? \'opacity-100 translate-y-0\' : \'opacity-100 md:opacity-0 md:-translate-y-2\'}`}>'
);

// Title/Info - always visible on mobile
content = content.replace(
  '          <div className={`absolute bottom-3 left-4 right-4 flex flex-col justify-end transition-all duration-300 ${isHovered ? \'opacity-100 translate-y-0\' : \'opacity-0 translate-y-2\'}`}>',
  '          <div className={`absolute bottom-2 md:bottom-3 left-2 right-2 md:left-4 md:right-4 flex flex-col justify-end transition-all duration-300 ${isHovered ? \'opacity-100 translate-y-0\' : \'opacity-100 md:opacity-0 md:translate-y-2\'}`}>'
);

// Play button size
content = content.replace(
  '                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors shadow-lg shadow-black/50 flex-shrink-0">',
  '                <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors shadow-lg shadow-black/50 flex-shrink-0">'
);
content = content.replace(
  '                  <Play className="w-4 h-4 text-black ml-0.5" fill="currentColor" />',
  '                  <Play className="w-3 h-3 md:w-4 md:h-4 text-black ml-0.5" fill="currentColor" />'
);

// Title text size
content = content.replace(
  '              <h3 className={`text-white font-bold text-sm md:text-base leading-tight drop-shadow-md truncate ${movie.is_collection ? \'text-lg\' : \'\'}`}>',
  '              <h3 className={`text-white font-bold text-xs md:text-base leading-tight drop-shadow-md truncate ${movie.is_collection ? \'text-sm md:text-lg\' : \'\'}`}>'
);

// Year/Parts text size
content = content.replace(
  '                {movie.release_year && <span className="text-zinc-300 text-xs font-semibold border border-zinc-500 px-1 rounded-sm leading-none py-0.5">{movie.release_year}</span>}',
  '                {movie.release_year && <span className="text-zinc-300 text-[10px] md:text-xs font-semibold border border-zinc-500 px-1 rounded-sm leading-none py-0.5">{movie.release_year}</span>}'
);
content = content.replace(
  '                  <span className="text-[#46d369] text-xs font-bold">',
  '                  <span className="text-[#46d369] text-[10px] md:text-xs font-bold">'
);

// On hover scale - disable on mobile
content = content.replace(
  '        className={`group relative w-full aspect-video flex-shrink-0 cursor-pointer transition-z duration-0 ${isHovered ? \'z-[70]\' : isAnimatingOut ? \'z-[60]\' : \'z-10\'}`}',
  '        className={`group relative w-full aspect-video flex-shrink-0 cursor-pointer transition-z duration-0 ${isHovered ? \'z-[70]\' : isAnimatingOut ? \'z-[60]\' : \'z-10\'}`}'
);

content = content.replace(
  '        <div className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ${isHovered ? \'scale-[1.25] shadow-[0_0_30px_rgba(0,0,0,0.9)]\' : \'scale-100\'}`}>',
  '        <div className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ${isHovered ? \'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]\' : \'scale-100\'}`}>'
);

fs.writeFileSync('src/components/MovieCard.tsx', content);
