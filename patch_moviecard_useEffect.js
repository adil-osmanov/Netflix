const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// Replace the states to initialize from props
content = content.replace(
  '  const [collectionCount, setCollectionCount] = useState<number>(0);\n  const [totalEpisodesCount, setTotalEpisodesCount] = useState(0);',
  '  const [collectionCount, setCollectionCount] = useState<number>(movie.collectionCount || 0);\n  const [totalEpisodesCount, setTotalEpisodesCount] = useState(movie.totalEpisodesCount || 0);'
);

// Replace the mount useEffect
const oldUseEffect = `  useEffect(() => {
    setMounted(true);
    const checkSettings = () => setHideAdmin(localStorage.getItem('netflix_hide_add_buttons') === 'true');
    checkSettings();
    window.addEventListener('storage', checkSettings);
    if (movie.is_collection) {
      getEpisodesAction(movie.id).then((result) => {
        if (result.success && result.data) {
          if (editOpen) setEpisodesToEdit(result.data);
          
          let hasSeasons = false;
          const parsedData = result.data.map((ep: any) => {
            try {
              const parsed = JSON.parse(ep.title);
              if (parsed.season) hasSeasons = true;
              return { ...ep, season: parsed.season || 1 };
            } catch (e) {
              return { ...ep, season: null };
            }
          });

          const isActuallySeries = movie.collection_type === 'series';
          if (isActuallySeries) {
            const uniqueSeasons = Array.from(new Set(parsedData.map((e: any) => e.season).filter(Boolean)));
            setCollectionCount(uniqueSeasons.length);
            setTotalEpisodesCount(result.data.length);
          } else {
            setCollectionCount(result.data.length);
            setTotalEpisodesCount(result.data.length);
          }
        }
      });
    }
    return () => window.removeEventListener('storage', checkSettings);
  }, [editOpen, movie.id, movie.is_collection]);`;

const newUseEffect = `  useEffect(() => {
    setMounted(true);
    const checkSettings = () => setHideAdmin(localStorage.getItem('netflix_hide_add_buttons') === 'true');
    checkSettings();
    window.addEventListener('storage', checkSettings);
    return () => window.removeEventListener('storage', checkSettings);
  }, []);

  useEffect(() => {
    if (editOpen && movie.is_collection) {
      getEpisodesAction(movie.id).then((result) => {
        if (result.success && result.data) {
          setEpisodesToEdit(result.data);
        }
      });
    }
  }, [editOpen, movie.id, movie.is_collection]);`;

content = content.replace(oldUseEffect, newUseEffect);

fs.writeFileSync('src/components/MovieCard.tsx', content);
