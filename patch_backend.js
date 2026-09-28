const fs = require('fs');
let content = fs.readFileSync('src/app/admin/add-content/actions.ts', 'utf8');

const oldEpInsert = `          return {
            content_id: contentData.id,
            title: ep.title || \`Серия \${index + 1}\`,
            telegram_link: epMessageId ? String(epMessageId) : ep.telegram_link,
            order_index: index,
          };`;

const newEpInsert = `          const defaultTitle = collection_type === 'franchise' ? \`Часть \${index + 1}\` : \`Серия \${index + 1}\`;
          return {
            content_id: contentData.id,
            title: ep.title || defaultTitle,
            telegram_link: epMessageId ? String(epMessageId) : ep.telegram_link,
            order_index: index,
          };`;

content = content.replace(oldEpInsert, newEpInsert);

// Actually, wait, if there are multiple seasons, `index + 1` is not just the episode number within the season, it's the global order_index!
// The user currently passes episodes as a flattened list from the frontend.
// Wait, how does the frontend construct the 'episodes' JSON string?
fs.writeFileSync('src/app/admin/add-content/actions.ts', content);
