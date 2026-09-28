const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input"); // npm install input

const apiId = parseInt(process.env.TELEGRAM_API_ID || "0"); // Вставь свой api_id
const apiHash = process.env.TELEGRAM_API_HASH || ""; // Вставь свой api_hash

const stringSession = new StringSession(""); // Пустая сессия для генерации новой

(async () => {
  if (apiId === 0 || apiHash === "") {
    console.log("Пожалуйста, укажи TELEGRAM_API_ID и TELEGRAM_API_HASH в коде или переменных окружения.");
    process.exit(1);
  }

  console.log("Подключение к Telegram...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Введите ваш номер телефона (с кодом страны, например +79991234567): "),
    password: async () => await input.text("Введите пароль (если включена 2FA): "),
    phoneCode: async () => await input.text("Введите код из Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("Вы успешно авторизовались!");
  console.log("Сохраните эту строку в TELEGRAM_SESSION в .env.local:");
  console.log("");
  console.log(client.session.save());
  console.log("");
  process.exit(0);
})();
