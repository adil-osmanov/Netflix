const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

content = content.replace(
  'import { Play } from "lucide-react";',
  'import { Play, CheckCircle2 } from "lucide-react";\nimport { useWatched } from "@/context/WatchedContext";'
);

content = content.replace(
  '  const searchParams = useSearchParams();',
  '  const searchParams = useSearchParams();\n  const { isWatched, toggleWatched } = useWatched();'
);

const oldButtons = `            <a 
              href={getPlayLink()!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                const category = searchParams.get('category') || 'all';
                setLastWatchedAction(category, displayMovie);
              }}
              className="bg-white text-black font-bold text-xs md:text-lg px-3 md:px-8 py-1.5 md:py-3 rounded-md flex items-center gap-1.5 md:gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"
            >
              <Play className="w-4 h-4 md:w-7 md:h-7" fill="currentColor" />
              Смотреть
            </a>
          )}`;

const newButtons = `            <div className="flex items-center gap-2 md:gap-4">
              <a 
                href={getPlayLink()!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  const category = searchParams.get('category') || 'all';
                  setLastWatchedAction(category, displayMovie);
                }}
                className="bg-white text-black font-bold text-xs md:text-lg px-3 md:px-8 py-1.5 md:py-3 rounded-md flex items-center gap-1.5 md:gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"
              >
                <Play className="w-4 h-4 md:w-7 md:h-7" fill="currentColor" />
                Смотреть
              </a>
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatched(displayMovie.id, null); }}
                className="bg-zinc-800/80 backdrop-blur-md text-white px-3 md:px-6 py-1.5 md:py-3 rounded-md flex items-center gap-2 hover:bg-zinc-700/80 transition-colors border border-zinc-600 shadow-lg drop-shadow-md font-bold text-xs md:text-lg cursor-pointer"
              >
                <CheckCircle2 className={\`w-4 h-4 md:w-6 md:h-6 \${isWatched(displayMovie.id, null) ? 'text-green-500' : 'text-white'}\`} />
                {isWatched(displayMovie.id, null) ? "Просмотрено" : "Просмотрено"}
              </button>
            </div>
          )}`;

content = content.replace(oldButtons, newButtons);

fs.writeFileSync('src/components/Hero.tsx', content);
