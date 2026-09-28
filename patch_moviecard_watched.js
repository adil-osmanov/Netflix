const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// Import action
content = content.replace(
  'import { deleteContentAction, getEpisodesAction } from "@/app/actions";',
  'import { deleteContentAction, getEpisodesAction, setLastWatchedAction } from "@/app/actions";'
);

// Replace handlePlay logic
const oldHandlePlay = `  const handlePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    const categoryType = window.location.search.includes('series') ? 'series' : 
                         window.location.search.includes('cartoons') ? 'cartoons' : 'movies';
    
    localStorage.setItem(\`lastWatched_\${categoryType}\`, JSON.stringify(movie));`;

const newHandlePlay = `  const handlePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    const urlParams = new URLSearchParams(window.location.search);
    const categoryType = urlParams.get('category') || 'all';
    
    setLastWatchedAction(categoryType, movie);`;

content = content.replace(oldHandlePlay, newHandlePlay);

fs.writeFileSync('src/components/MovieCard.tsx', content);
