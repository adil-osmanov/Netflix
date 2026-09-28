const fs = require('fs');
let content = fs.readFileSync('src/components/CollectionViewerModal.tsx', 'utf8');

// Ensure setLastWatchedAction is imported
if (!content.includes('setLastWatchedAction')) {
  content = content.replace(
    'import { getEpisodesAction } from "@/app/actions";',
    'import { getEpisodesAction, setLastWatchedAction } from "@/app/actions";'
  );
}

// Update the <a> tag to include onClick for last watched
const oldAnchor = `                    <a 
                      key={ep.id}
                      href={getEpisodeLink(ep)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-6 p-4 border-b border-zinc-800 group hover:bg-[#2f2f2f] transition-colors cursor-pointer rounded-lg"
                    >`;

const newAnchor = `                    <a 
                      key={ep.id}
                      href={getEpisodeLink(ep)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        const urlParams = new URLSearchParams(window.location.search);
                        const categoryType = urlParams.get('category') || 'all';
                        setLastWatchedAction(categoryType, movie);
                      }}
                      className="flex items-center gap-6 p-4 border-b border-zinc-800 group hover:bg-[#2f2f2f] transition-colors cursor-pointer rounded-lg"
                    >`;

content = content.replace(oldAnchor, newAnchor);
fs.writeFileSync('src/components/CollectionViewerModal.tsx', content);
