const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

// 1. Import new actions
content = content.replace(
  'import { getCollectionPartsInfoAction } from "@/app/actions";',
  'import { getCollectionPartsInfoAction, getLastWatchedAction, setLastWatchedAction } from "@/app/actions";'
);

// 2. Update the initial load effect
const oldEffect = `  useEffect(() => {
    const category = searchParams.get('category') || 'movies';
    const lastWatched = localStorage.getItem(\`lastWatched_\${category}\`);
    if (lastWatched) {
      try {
        const parsed = JSON.parse(lastWatched);
        setDisplayMovie(parsed);
      } catch (e) {
        console.error("Failed to parse lastWatched", e);
        setDisplayMovie(movie);
      }
    } else {
      setDisplayMovie(movie);
    }
    setMounted(true);
  }, [searchParams, movie]);`;

const newEffect = `  useEffect(() => {
    const category = searchParams.get('category') || 'all';
    
    async function loadLastWatched() {
      const dbWatched = await getLastWatchedAction(category);
      if (dbWatched) {
        setDisplayMovie(dbWatched);
      } else {
        setDisplayMovie(movie);
      }
      setMounted(true);
    }
    
    loadLastWatched();
  }, [searchParams, movie]);`;

content = content.replace(oldEffect, newEffect);

// 3. Update the play button handler
const oldHandlePlay = `      const category = searchParams.get('category') || 'movies';
      localStorage.setItem(\`lastWatched_\${category}\`, JSON.stringify(displayMovie));`;

const newHandlePlay = `      const category = searchParams.get('category') || 'all';
      setLastWatchedAction(category, displayMovie);`;

content = content.replace(oldHandlePlay, newHandlePlay);

fs.writeFileSync('src/components/Hero.tsx', content);
