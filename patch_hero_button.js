const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

// 1. Precompute the link
const getLinkFunc = `
  const getPlayLink = () => {
    if (displayMovie?.is_collection) return null;
    let url = displayMovie?.telegram_url;
    if (url && !url.includes('http')) {
      const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
      url = \`https://t.me/c/\${channelId}/\${url}\`;
    }
    return url || '#';
  };`;

content = content.replace(
  '  const handlePlay = () => {',
  getLinkFunc + '\n  const handlePlay = () => {'
);

// 2. Modify the button render block
const oldBtn = `        <div className="flex items-center gap-4">
          <button 
            onClick={handlePlay}
            className="bg-white text-black font-bold text-xs md:text-lg px-3 md:px-8 py-1.5 md:py-3 rounded-md flex items-center gap-1.5 md:gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"
          >
            <Play className="w-4 h-4 md:w-7 md:h-7" fill="currentColor" />
            Смотреть
          </button>
        </div>`;

const newBtn = `        <div className="flex items-center gap-4">
          {displayMovie.is_collection ? (
            <button 
              onClick={() => setModalOpen(true)}
              className="bg-white text-black font-bold text-xs md:text-lg px-3 md:px-8 py-1.5 md:py-3 rounded-md flex items-center gap-1.5 md:gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"
            >
              <Play className="w-4 h-4 md:w-7 md:h-7" fill="currentColor" />
              Смотреть
            </button>
          ) : (
            <a 
              href={getPlayLink()!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                const category = searchParams.get('category') || 'all';
                setLastWatchedAction(category, displayMovie);
              }}
              className="bg-white text-black font-bold text-xs md:text-lg px-3 md:px-8 py-1.5 md:py-3 rounded-md flex items-center gap-1.5 md:gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"
            >
              <Play className="w-4 h-4 md:w-7 md:h-7" fill="currentColor" />
              Смотреть
            </a>
          )}
        </div>`;

content = content.replace(oldBtn, newBtn);

fs.writeFileSync('src/components/Hero.tsx', content);
