const fs = require('fs');
let content = fs.readFileSync('src/components/CollectionViewerModal.tsx', 'utf8');

// Imports
content = content.replace(
  'import { Play, X, ChevronDown } from "lucide-react";',
  'import { Play, X, ChevronDown, CheckCircle2 } from "lucide-react";\nimport { useWatched } from "@/context/WatchedContext";'
);

// Destructure hook inside component
content = content.replace(
  '  const [episodes, setEpisodes] = useState<any[]>([]);',
  '  const { isWatched, toggleWatched } = useWatched();\n  const [episodes, setEpisodes] = useState<any[]>([]);'
);

// Render checkmark for each episode
const oldEpisodeBlock = `                      <div className="flex flex-col flex-1">
                        <span className="text-white font-bold text-lg">{getDisplayName(ep.parsedTitle, idx)}</span>
                      </div>
                    </a>`;

const newEpisodeBlock = `                      <div className="flex flex-col flex-1">
                        <span className="text-white font-bold text-lg">{getDisplayName(ep.parsedTitle, idx)}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatched(movie.id, ep.id); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                        title={isWatched(movie.id, ep.id) ? "Отметить как непросмотренное" : "Отметить как просмотренное"}
                      >
                        <CheckCircle2 className={\`w-6 h-6 \${isWatched(movie.id, ep.id) ? 'text-green-500' : 'text-zinc-600'}\`} />
                      </button>
                    </a>`;

content = content.replace(oldEpisodeBlock, newEpisodeBlock);

fs.writeFileSync('src/components/CollectionViewerModal.tsx', content);
