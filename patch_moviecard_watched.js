const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// 1. Imports
content = content.replace(
  'import { Play, Pencil, Trash2 } from "lucide-react";',
  'import { Play, Pencil, Trash2, CheckCircle2 } from "lucide-react";\nimport { useWatched } from "@/context/WatchedContext";'
);

// 2. Add useWatched hook and state
content = content.replace(
  '  const [collectionCount, setCollectionCount] = useState(0);',
  '  const [collectionCount, setCollectionCount] = useState(0);\n  const [totalEpisodesCount, setTotalEpisodesCount] = useState(0);\n  const { isWatched, toggleWatched, getCollectionProgress } = useWatched();'
);

// 3. Update useEffect to set totalEpisodesCount
content = content.replace(
  '            setCollectionCount(uniqueSeasons.length);',
  '            setCollectionCount(uniqueSeasons.length);\n            setTotalEpisodesCount(result.data.length);'
);
content = content.replace(
  '            setCollectionCount(result.data.length);\n          }',
  '            setCollectionCount(result.data.length);\n            setTotalEpisodesCount(result.data.length);\n          }'
);

// 4. Calculate progress
const getProgressCode = `
  const progress = movie.is_collection ? getCollectionProgress(movie.id, totalEpisodesCount) : (isWatched(movie.id, null) ? 100 : 0);
  const getPlayLink = () => {`;

content = content.replace('  const getPlayLink = () => {', getProgressCode);

// 5. Add checkmark for standalone movies next to CC badge
const ccBadgeStr = `{movie.has_subtitles && (
                  <span className="px-1 py-0.5 border border-zinc-400 text-zinc-300 text-[9px] md:text-[10px] rounded-[3px] font-bold tracking-wider leading-none shadow-sm flex items-center justify-center">
                    CC
                  </span>
                )}
              </div>
            )}`;

const newCcBadgeStr = `{movie.has_subtitles && (
                  <span className="px-1 py-0.5 border border-zinc-400 text-zinc-300 text-[9px] md:text-[10px] rounded-[3px] font-bold tracking-wider leading-none shadow-sm flex items-center justify-center">
                    CC
                  </span>
                )}
                {!movie.is_collection && (
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatched(movie.id, null); }}
                    className="ml-auto w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors z-30 relative"
                    title={isWatched(movie.id, null) ? "Отметить как непросмотренное" : "Отметить как просмотренное"}
                  >
                    <CheckCircle2 className={\`w-4 h-4 \${isWatched(movie.id, null) ? 'text-green-500' : 'text-zinc-600'}\`} />
                  </button>
                )}
              </div>
            )}`;

content = content.replace(ccBadgeStr, newCcBadgeStr);

// 6. Add Progress Bar at the very bottom of the poster image, inside the absolute inset-0 wrapper
const progressBarCode = `
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 md:h-1.5 bg-zinc-800/80 z-40 overflow-hidden">
              <div className="h-full bg-[#E50914] transition-all duration-500" style={{ width: \`\${progress}%\` }} />
            </div>
          )}
        </div>
      </div>`;

content = content.replace('        </div>\n      </div>', progressBarCode);

fs.writeFileSync('src/components/MovieCard.tsx', content);
