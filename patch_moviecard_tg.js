const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

content = content.replace(
  'import { useWatched } from "@/context/WatchedContext";',
  'import { useWatched } from "@/context/WatchedContext";\nimport { getTelegramDeepLink } from "@/utils/telegram";'
);

const oldLinkCode = `  const getPlayLink = () => {
    if (movie.is_collection) return undefined;
    let url = movie.telegram_url;
    if (url && !url.includes('http')) {
      const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
      url = \`https://t.me/c/\${channelId}/\${url}\`;
    }
    return url || undefined;
  };`;

const newLinkCode = `  const getPlayLink = () => {
    if (movie.is_collection) return undefined;
    const link = getTelegramDeepLink(movie.telegram_url);
    return link === '#' ? undefined : link;
  };`;

content = content.replace(oldLinkCode, newLinkCode);

fs.writeFileSync('src/components/MovieCard.tsx', content);
