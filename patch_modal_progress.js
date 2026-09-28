const fs = require('fs');
let content = fs.readFileSync('src/components/CollectionViewerModal.tsx', 'utf8');

const oldVar = '  const displayedEpisodes = isSeries \n    ? episodes.filter(e => e.season === activeSeason) \n    : episodes;';
const newVar = `  const displayedEpisodes = isSeries 
    ? episodes.filter(e => e.season === activeSeason) 
    : episodes;

  const seasonWatchedCount = displayedEpisodes.filter(ep => isWatched(movie.id, ep.id)).length;
  const seasonProgress = displayedEpisodes.length > 0 ? (seasonWatchedCount / displayedEpisodes.length) * 100 : 0;`;

content = content.replace(oldVar, newVar);

const oldSelector = `{isSeries ? (
                <div className="relative">
                  <button 
                    onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                    className="flex items-center gap-2 md:gap-3 bg-zinc-800 text-white font-bold text-lg md:text-2xl px-4 md:px-5 py-2 md:py-3 rounded hover:bg-zinc-700 transition-colors"
                  >
                    Сезон {activeSeason}
                    <ChevronDown className={\`w-5 h-5 md:w-6 md:h-6 transition-transform \${isSeasonDropdownOpen ? 'rotate-180' : ''}\`} />
                  </button>`;

const newSelector = `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              {isSeries ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1">
                  <div className="relative">
                    <button 
                      onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                      className="flex items-center gap-2 md:gap-3 bg-zinc-800 text-white font-bold text-lg md:text-2xl px-4 md:px-5 py-2 md:py-3 rounded hover:bg-zinc-700 transition-colors"
                    >
                      Сезон {activeSeason}
                      <ChevronDown className={\`w-5 h-5 md:w-6 md:h-6 transition-transform \${isSeasonDropdownOpen ? 'rotate-180' : ''}\`} />
                    </button>`;

content = content.replace(oldSelector, newSelector);

const dropdownEnd = `                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <h3 className="text-white font-bold text-lg md:text-2xl">
                  {movie.collection_type === 'franchise' ? 'Части фильма' : 'Эпизоды'}
                </h3>
              )}`;

const newDropdownEnd = `                      </div>
                    </div>
                  )}
                  </div>
                  
                  {displayedEpisodes.length > 0 && (
                    <div className="flex flex-col flex-1 max-w-[200px]">
                      <div className="flex justify-between items-center text-xs text-zinc-400 font-bold tracking-wider mb-2">
                        <span>ПРОСМОТРЕНО</span>
                        <span>{seasonWatchedCount} ИЗ {displayedEpisodes.length}</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#E50914] transition-all duration-500 rounded-full" style={{ width: \`\${seasonProgress}%\` }} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <h3 className="text-white font-bold text-lg md:text-2xl">
                    {movie.collection_type === 'franchise' ? 'Части фильма' : 'Эпизоды'}
                  </h3>
                  {displayedEpisodes.length > 0 && (
                    <div className="flex flex-col w-full sm:max-w-[200px]">
                      <div className="flex justify-between items-center text-xs text-zinc-400 font-bold tracking-wider mb-2">
                        <span>ПРОСМОТРЕНО</span>
                        <span>{seasonWatchedCount} ИЗ {displayedEpisodes.length}</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#E50914] transition-all duration-500 rounded-full" style={{ width: \`\${seasonProgress}%\` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>`;

content = content.replace(dropdownEnd, newDropdownEnd);

fs.writeFileSync('src/components/CollectionViewerModal.tsx', content);
