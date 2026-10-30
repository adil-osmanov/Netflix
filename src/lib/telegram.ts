/**
 * Утилита прямого запуска нативного приложения Telegram (Deep Link) на macOS / iOS / Windows / Android
 */
export function openTelegramLink(rawUrl: string) {
  if (!rawUrl) return;

  let deepLink = rawUrl.trim();

  // Уже tg:// протокол
  if (deepLink.startsWith("tg://")) {
    window.location.href = deepLink;
    return;
  }

  // Если передан только ID сообщения (например, "1234")
  if (!deepLink.includes("http") && /^\d+$/.test(deepLink)) {
    const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
    window.location.href = `tg://privatepost?channel=${channelId}&post=${deepLink}`;
    return;
  }

  // Если ссылка в формате приватного канала https://t.me/c/123456789/123
  const privateMatch = deepLink.match(/t\.me\/c\/(\d+)\/(\d+)/);
  if (privateMatch) {
    deepLink = `tg://privatepost?channel=${privateMatch[1]}&post=${privateMatch[2]}`;
    window.location.href = deepLink;
    return;
  }

  // Если ссылка-приглашение https://t.me/+hash
  const joinMatch = deepLink.match(/t\.me\/\+([a-zA-Z0-9_-]+)/);
  if (joinMatch) {
    deepLink = `tg://join?invite=${joinMatch[1]}`;
    window.location.href = deepLink;
    return;
  }

  // Если ссылка на публичный канал https://t.me/username/123 или https://t.me/username
  const publicMatch = deepLink.match(/t\.me\/([a-zA-Z0-9_]+)(?:\/(\d+))?/);
  if (publicMatch) {
    const channel = publicMatch[1];
    const post = publicMatch[2];
    deepLink = post
      ? `tg://resolve?domain=${channel}&post=${post}`
      : `tg://resolve?domain=${channel}`;
    window.location.href = deepLink;
    return;
  }

  // Открываем напрямую через протокол приложения
  window.location.href = deepLink;
}
