const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

// Replace import
content = content.replace(
  'import { supabase } from "@/utils/supabase";',
  'import { getCollectionPartsInfoAction } from "@/app/actions";'
);

// Replace fetch logic
const oldFetch = `      const { data } = await supabase
        .from('content_items')
        .select('season_number')
        .eq('content_id', displayMovie.id);
        
      if (data && data.length > 0) {
        if (displayMovie.collection_type === 'series') {
          const seasons = new Set(data.map(item => item.season_number));
          setPartsInfo(\`\${seasons.size} \${seasons.size === 1 ? 'сезон' : (seasons.size < 5 ? 'сезона' : 'сезонов')}\`);
        } else {
          const count = data.length;
          setPartsInfo(\`\${count} \${count === 1 ? 'часть' : (count < 5 ? 'части' : 'частей')}\`);
        }
      } else {
        setPartsInfo(null);
      }`;

const newFetch = `      const info = await getCollectionPartsInfoAction(displayMovie.id, displayMovie.collection_type);
      setPartsInfo(info);`;

content = content.replace(oldFetch, newFetch);
fs.writeFileSync('src/components/Hero.tsx', content);
