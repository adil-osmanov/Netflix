const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

content = content.replace(
  '  const [collectionCount, setCollectionCount] = useState<number>(0);',
  '  const [collectionCount, setCollectionCount] = useState<number>(0);\n  const [totalEpisodesCount, setTotalEpisodesCount] = useState(0);\n  const { isWatched, toggleWatched, getCollectionProgress } = useWatched();'
);

fs.writeFileSync('src/components/MovieCard.tsx', content);
