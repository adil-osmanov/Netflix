const fs = require('fs');
let content = fs.readFileSync('src/components/CollectionViewerModal.tsx', 'utf8');

content = content.replace(
  'import { useWatched } from "@/context/WatchedContext";',
  'import { useWatched } from "@/context/WatchedContext";\nimport { getTelegramDeepLink } from "@/utils/telegram";'
);

const oldLinkCode = `  const getEpisodeLink = (ep: any) => {
    let link = ep.telegram_link || movie.telegram_url;
    if (link && !link.includes('http')) {
      const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
      link = \`https://t.me/c/\${channelId}/\${link}\`;
    }
    return link || '#';
  };`;

const newLinkCode = `  const getEpisodeLink = (ep: any) => {
    return getTelegramDeepLink(ep.telegram_link || movie.telegram_url);
  };`;

content = content.replace(oldLinkCode, newLinkCode);

// There is also playEpisode which is a fallback function, although we changed it to native <a> tags.
// Let's replace playEpisode logic just in case it's used.
const oldPlayCode = `  const playEpisode = (ep: any) => {
    let link = ep.telegram_link || movie.telegram_url;
    if (link && !link.includes('http')) {
      const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
      link = \`https://t.me/c/\${channelId}/\${link}\`;
    }
    if (link) window.open(link, '_blank');
  };`;

const newPlayCode = `  const playEpisode = (ep: any) => {
    const link = getTelegramDeepLink(ep.telegram_link || movie.telegram_url);
    if (link && link !== '#') window.open(link, '_blank');
  };`;

content = content.replace(oldPlayCode, newPlayCode);

fs.writeFileSync('src/components/CollectionViewerModal.tsx', content);
