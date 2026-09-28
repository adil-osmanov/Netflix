const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

content = content.replace(
  'import { useWatched } from "@/context/WatchedContext";',
  'import { useWatched } from "@/context/WatchedContext";\nimport { getTelegramDeepLink } from "@/utils/telegram";'
);

const oldLinkCode = `  const getPlayLink = () => {
    if (displayMovie?.is_collection) return null;
    let url = displayMovie?.telegram_url;
    if (url && !url.includes('http')) {
      const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
      url = \`https://t.me/c/\${channelId}/\${url}\`;
    }
    return url || '#';
  };`;

const newLinkCode = `  const getPlayLink = () => {
    if (displayMovie?.is_collection) return null;
    return getTelegramDeepLink(displayMovie?.telegram_url);
  };`;

content = content.replace(oldLinkCode, newLinkCode);

// Also check if target="_blank" should be kept.
// Actually target="_blank" is fine, browsers handle tg:// gracefully even with _blank.
// But Safari often warns if it's _blank. Actually, native links like mailto: or tg: work best WITHOUT target="_blank".
// If we remove target="_blank", it will just try to navigate, intercept the protocol, and open the app.
// I'll keep target="_blank" as it usually works anyway, but removing it for tg:// is slightly cleaner. I won't bother unless it's a problem.

fs.writeFileSync('src/components/Hero.tsx', content);
