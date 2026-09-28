export function getTelegramDeepLink(url: string | undefined | null): string {
  if (!url) return '#';
  
  // Already a deep link
  if (url.startsWith('tg://')) return url;

  // Just a message ID (e.g. "1234")
  if (!url.includes('http') && /^\d+$/.test(url)) {
    const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
    return `tg://privatepost?channel=${channelId}&post=${url}`;
  }

  // Private channel web link (e.g. "https://t.me/c/12345/678")
  const privateMatch = url.match(/t\.me\/c\/(\d+)\/(\d+)/);
  if (privateMatch) {
    return `tg://privatepost?channel=${privateMatch[1]}&post=${privateMatch[2]}`;
  }

  // Public channel web link (e.g. "https://t.me/durov/123")
  const publicMatch = url.match(/t\.me\/([a-zA-Z0-9_]+)\/(\d+)/);
  if (publicMatch) {
    return `tg://resolve?domain=${publicMatch[1]}&post=${publicMatch[2]}`;
  }

  // If it's some other link, just return it
  return url;
}
