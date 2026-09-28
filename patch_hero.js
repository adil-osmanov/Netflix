const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

// Import supabase
content = content.replace(
  'import { useSearchParams } from "next/navigation";',
  'import { useSearchParams } from "next/navigation";\nimport { supabase } from "@/utils/supabase";'
);

// Add state and useEffect for partsInfo
const stateAndEffect = `
  const [modalOpen, setModalOpen] = useState(false);
  const [partsInfo, setPartsInfo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPartsInfo() {
      if (!displayMovie?.is_collection) {
        setPartsInfo(null);
        return;
      }
      
      const { data } = await supabase
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
      }
    }
    if (displayMovie) {
      fetchPartsInfo();
    }
  }, [displayMovie]);
`;
content = content.replace('  const [modalOpen, setModalOpen] = useState(false);', stateAndEffect);

// Replace render logic
const renderLogic = `
  if (!mounted || !displayMovie) return <div className="min-h-[75vh] w-full bg-[#141414] animate-pulse"></div>;

  let displayTitle = displayMovie.title;
  let year = null;
  const yearMatch = displayTitle.match(/\\b(19\\d{2}|20\\d{2})\\b/);
  
  if (yearMatch) {
    year = yearMatch[0];
    displayTitle = displayTitle.replace(/\\s*[\\(\\[]?\\b(19\\d{2}|20\\d{2})\\b[\\)\\]]?\\s*/, ' ').trim();
  }

  return (
    <div 
      className="relative w-full min-h-[75vh] flex flex-col justify-end pb-16 z-10 bg-[#141414]"
`;
content = content.replace(
  '  if (!mounted || !displayMovie) return <div className="min-h-[75vh] w-full bg-[#141414] animate-pulse"></div>;\n\n  return (\n    <div \n      className="relative w-full min-h-[75vh] flex flex-col justify-end pb-16 z-10 bg-[#141414]"',
  renderLogic
);

// Replace metadata row and title
const newMetadata = `
        <h1 className="text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 drop-shadow-2xl">
          {displayTitle}
        </h1>
        
        {/* Real Netflix Style Metadata Row */}
        {(year || partsInfo) && (
          <div className="flex items-center gap-3 md:gap-4 text-sm md:text-base font-semibold mb-6 drop-shadow-md">
            {year && <span className="text-zinc-300">{year}</span>}
            {partsInfo && <span className="text-zinc-300">{partsInfo}</span>}
          </div>
        )}

        {displayMovie.description && (
          <p className="text-lg text-zinc-200 mb-10 line-clamp-3 md:line-clamp-4 max-w-2xl leading-snug drop-shadow-lg">
            {displayMovie.description}
          </p>
        )}
        
        {!displayMovie.description && <div className="mb-10" />}
`;

const oldMetadataStart = `        <h1 className="text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 drop-shadow-2xl">
          {displayMovie.title}
        </h1>`;
const oldMetadataEnd = `        {!displayMovie.description && <div className="mb-10" />}`;

const startIndex = content.indexOf(oldMetadataStart);
const endIndex = content.indexOf(oldMetadataEnd) + oldMetadataEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newMetadata + content.substring(endIndex);
}

fs.writeFileSync('src/components/Hero.tsx', content);
