const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// Find everything from 'const cardInner = (' to the end of the file
const startIdx = content.indexOf('  const cardInner = (');
if (startIdx === -1) {
  console.error("Could not find cardInner");
  process.exit(1);
}

const beforeReturn = content.substring(0, startIdx);

const newReturn = `
  return (
    <>
      <div 
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('movieId', movie.id);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={\`group relative w-full aspect-video flex-shrink-0 transition-z duration-0 \${isHovered ? 'z-[70]' : isAnimatingOut ? 'z-[60]' : 'z-10'}\`}
      >
        <div className={\`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] \${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}\`}>
          
          {/* Background and Clickable Area */}
          {movie.is_collection ? (
            <div onClick={handlePlay} className="absolute inset-0 z-0 cursor-pointer">
              <img src={movie.cover_url} alt={movie.title} className="w-full h-full object-cover transition-transform duration-300" />
              <div className={\`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-black/95 via-black/30 to-transparent \${isHovered ? 'opacity-100' : 'opacity-100 md:opacity-0'}\`} />
            </div>
          ) : (
            <a 
              href={getPlayLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                const urlParams = new URLSearchParams(window.location.search);
                const categoryType = urlParams.get('category') || 'all';
                setLastWatchedAction(categoryType, movie);
              }}
              className="absolute inset-0 z-0 cursor-pointer block"
            >
              <img src={movie.cover_url} alt={movie.title} className="w-full h-full object-cover transition-transform duration-300" />
              <div className={\`absolute inset-0 transition-opacity duration-300 bg-gradient-to-t from-black/95 via-black/30 to-transparent \${isHovered ? 'opacity-100' : 'opacity-100 md:opacity-0'}\`} />
            </a>
          )}

          {/* Top Right: Edit & Delete (z-20) */}
          {!hideAdmin && (
            <div className={\`absolute top-2 right-2 md:top-3 md:right-3 hidden md:flex gap-2 transition-all duration-300 z-20 \${isHovered ? 'opacity-100 translate-y-0' : 'opacity-100 md:opacity-0 md:-translate-y-2'}\`}>
              <button 
                onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
                className="w-8 h-8 bg-black/60 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all cursor-pointer relative z-30"
                title="Редактировать"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                className="w-8 h-8 bg-black/60 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-[#E50914] hover:border-[#E50914] transition-all cursor-pointer relative z-30"
                title="Удалить"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bottom Left: Text (z-10, pointer-events-none) */}
          <div className={\`absolute bottom-2 md:bottom-3 left-2 right-2 md:left-4 md:right-4 flex flex-col justify-end transition-all duration-300 z-10 pointer-events-none \${isHovered ? 'opacity-100 translate-y-0' : 'opacity-100 md:opacity-0 md:translate-y-2'}\`}>
            <div className="flex items-center gap-3 mb-1">
              {!movie.is_collection && (
                <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center transition-colors shadow-lg shadow-black/50 flex-shrink-0">
                  <Play className="w-3 h-3 md:w-4 md:h-4 text-black ml-0.5" fill="currentColor" />
                </div>
              )}
              <h3 className={\`text-white font-bold text-xs md:text-base leading-tight drop-shadow-md truncate \${movie.is_collection ? 'text-sm md:text-lg' : ''}\`}>
                {movie.title}
              </h3>
            </div>
            
            {(movie.release_year || (movie.is_collection && collectionCount > 0) || movie.has_subtitles) && (
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
            )}
          </div>

        </div>
      </div>

      <CollectionViewerModal 
        movie={movie} 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />

      {editOpen && (
        <AddContentModal 
          genreId={movie.genre_id || ""}
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          movieToEdit={movie}
          episodesToEdit={episodesToEdit}
        />
      )}

      {deleteModalContent}
    </>
  );
}
`;

fs.writeFileSync('src/components/MovieCard.tsx', beforeReturn + newReturn);
