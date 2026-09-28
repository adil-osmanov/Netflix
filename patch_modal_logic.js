const fs = require('fs');
let content = fs.readFileSync('src/components/CollectionViewerModal.tsx', 'utf8');

const oldLogic = `          if (hasSeasons) {
            setIsSeries(true);
            const uniqueSeasons = Array.from(new Set(parsedData.map((e: any) => e.season).filter(Boolean))) as number[];
            uniqueSeasons.sort((a, b) => a - b);
            setSeasons(uniqueSeasons);
            if (uniqueSeasons.length > 0) setActiveSeason(uniqueSeasons[0]);
          } else {
            setIsSeries(false);
          }`;

const newLogic = `          const isActuallySeries = movie.collection_type === 'series';
          if (isActuallySeries) {
            setIsSeries(true);
            const uniqueSeasons = Array.from(new Set(parsedData.map((e: any) => e.season).filter(Boolean))) as number[];
            uniqueSeasons.sort((a, b) => a - b);
            setSeasons(uniqueSeasons);
            if (uniqueSeasons.length > 0) setActiveSeason(uniqueSeasons[0]);
          } else {
            setIsSeries(false);
          }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/CollectionViewerModal.tsx', content);
