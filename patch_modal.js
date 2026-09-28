const fs = require('fs');
let content = fs.readFileSync('src/components/AddContentModal.tsx', 'utf8');

// 1. Remove required from title input
const oldInput = `                        <input 
                          type="text" 
                          required
                          placeholder={isActuallyFranchise ? \`Часть \${eIdx + 1}\` : \`Серия \${eIdx + 1}\`}
                          value={ep.title}
                          onChange={(e) => updateEpisode(sIdx, eIdx, 'title', e.target.value)}`;

const newInput = `                        <input 
                          type="text" 
                          
                          placeholder={isActuallyFranchise ? \`Часть \${eIdx + 1}\` : \`Серия \${eIdx + 1}\`}
                          value={ep.title}
                          onChange={(e) => updateEpisode(sIdx, eIdx, 'title', e.target.value)}`;

content = content.replace(oldInput, newInput);

// 2. Fix the submission filter logic
const oldFilter = `    if (formData.is_collection) {
      const flatEpisodes: any[] = [];
      formData.seasons.forEach((season) => {
        season.episodes.forEach((ep) => {
          if (ep.title && ep.telegram_link) {
            flatEpisodes.push({
              title: JSON.stringify({ season: season.seasonNumber, title: ep.title }),
              telegram_link: ep.telegram_link
            });
          }
        });
      });`;

const newFilter = `    if (formData.is_collection) {
      const flatEpisodes: any[] = [];
      formData.seasons.forEach((season) => {
        season.episodes.forEach((ep, eIdx) => {
          if (ep.telegram_link) {
            const isActuallyFranchise = finalCollectionType === 'franchise';
            const defaultTitle = isActuallyFranchise ? \`Часть \${eIdx + 1}\` : \`Серия \${eIdx + 1}\`;
            flatEpisodes.push({
              title: JSON.stringify({ season: season.seasonNumber, title: ep.title || defaultTitle }),
              telegram_link: ep.telegram_link
            });
          }
        });
      });`;

content = content.replace(oldFilter, newFilter);

fs.writeFileSync('src/components/AddContentModal.tsx', content);
