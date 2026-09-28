const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldLogic = `          if (hasSeasons) {
            const uniqueSeasons = Array.from(new Set(parsedData.map((e: any) => e.season).filter(Boolean)));
            setCollectionCount(uniqueSeasons.length);
          } else {
            setCollectionCount(result.data.length);
          }`;

const newLogic = `          const isActuallySeries = movie.collection_type === 'series';
          if (isActuallySeries) {
            const uniqueSeasons = Array.from(new Set(parsedData.map((e: any) => e.season).filter(Boolean)));
            setCollectionCount(uniqueSeasons.length);
          } else {
            setCollectionCount(result.data.length);
          }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/MovieCard.tsx', content);
