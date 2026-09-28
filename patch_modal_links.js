const fs = require('fs');
let content = fs.readFileSync('src/components/CollectionViewerModal.tsx', 'utf8');

// Instead of computing the link on click, let's pre-compute it and render an <a> tag
const newPlayEpisodeCode = `
  const getEpisodeLink = (ep: any) => {
    let link = ep.telegram_link || movie.telegram_url;
    if (link && !link.includes('http')) {
      const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
      link = \`https://t.me/c/\${channelId}/\${link}\`;
    }
    return link || '#';
  };`;

content = content.replace(
  '  const playEpisode = (ep: any) => {',
  newPlayEpisodeCode + '\n  const playEpisode = (ep: any) => {'
);

const oldDiv = `                    <div 
                      key={ep.id}
                      onClick={() => playEpisode(ep)}
                      className="flex items-center gap-6 p-4 border-b border-zinc-800 group hover:bg-[#2f2f2f] transition-colors cursor-pointer rounded-lg"
                    >`;

const newDiv = `                    <a 
                      key={ep.id}
                      href={getEpisodeLink(ep)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-6 p-4 border-b border-zinc-800 group hover:bg-[#2f2f2f] transition-colors cursor-pointer rounded-lg"
                    >`;

content = content.replace(oldDiv, newDiv);
content = content.replace('                    </div>\n                  ))}', '                    </a>\n                  ))}');

fs.writeFileSync('src/components/CollectionViewerModal.tsx', content);
