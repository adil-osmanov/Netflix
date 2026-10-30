import { createClient } from "@supabase/supabase-js";
import { resolveChannelName, resolveChannelTitleById } from "@/lib/youtube";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Subscription {
  id?: string;
  channel_id: string;
  channel_title: string;
  channel_thumbnail?: string;
  language: "DE" | "EN";
  created_at?: string;
  name?: string;
}

export const DEFAULT_DE_SUBSCRIPTIONS: Subscription[] = [
  {
    channel_id: "UCbxb2fqe9oNgglAoYqsYOtQ",
    channel_title: "Easy German",
    name: "Easy German",
    language: "DE",
  },
  {
    channel_id: "UCZHpIFMfoJJ_1QxNGLJTzyA",
    channel_title: "MrWissen2go",
    name: "MrWissen2go",
    language: "DE",
  },
  {
    channel_id: "UC4-a6QWRyBlzTFGdS-T_wfw",
    channel_title: "SWR Handwerkskunst",
    name: "SWR Handwerkskunst",
    language: "DE",
  },
  {
    channel_id: "UCUuab1dctZzN5ZmRmQnTzkg",
    channel_title: "WDR Doku",
    name: "WDR Doku",
    language: "DE",
  },
];

export const DEFAULT_EN_SUBSCRIPTIONS: Subscription[] = [
  {
    channel_id: "UCKyTokYo0nK2OA-az-sDijA",
    channel_title: "VOA Learning English",
    name: "VOA Learning English",
    language: "EN",
  },
  {
    channel_id: "UCsooa4yRKGN_zEE8iknghZA",
    channel_title: "TED-Ed",
    name: "TED-Ed",
    language: "EN",
  },
  {
    channel_id: "UCLXo7UDZvByw2ixzpQCufnA",
    channel_title: "Vox",
    name: "Vox",
    language: "EN",
  },
  {
    channel_id: "UCHnyfMqiRRG1u-2MsSQLbXA",
    channel_title: "Veritasium",
    name: "Veritasium",
    language: "EN",
  },
];

// Получение подписок для текущего языка (с fallback на localStorage и дефолты)
export async function fetchSubscriptions(language: "DE" | "EN"): Promise<Subscription[]> {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("language", language)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) {
      const sanitized = data.map((item) => {
        const rawTitle = (item.channel_title || item.name || "").trim();
        const isPlaceholder =
          !rawTitle ||
          rawTitle.toLowerCase() === "канал" ||
          rawTitle.toLowerCase() === "undefined";
        if (isPlaceholder) {
          const matchedDefault = [...DEFAULT_DE_SUBSCRIPTIONS, ...DEFAULT_EN_SUBSCRIPTIONS].find(
            (d) => d.channel_id === item.channel_id
          );
          const cleanTitle = matchedDefault ? matchedDefault.channel_title : "";
          return {
            ...item,
            channel_title: cleanTitle,
            name: cleanTitle,
          };
        }
        return {
          ...item,
          name: item.channel_title,
        };
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(
          `cached_subscriptions_${language.toLowerCase()}`,
          JSON.stringify(sanitized)
        );
      }
      return sanitized;
    }
  } catch (err) {
    console.error("Ошибка загрузки подписок из БД:", err);
  }

  // Fallback на локальный кэш при отсутствии сети или таблицы
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`cached_subscriptions_${language.toLowerCase()}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => {
            const rawTitle = (item.channel_title || item.name || "").trim();
            const isPlaceholder =
              !rawTitle ||
              rawTitle.toLowerCase() === "канал" ||
              rawTitle.toLowerCase() === "undefined";
            if (isPlaceholder) {
              const matchedDefault = [...DEFAULT_DE_SUBSCRIPTIONS, ...DEFAULT_EN_SUBSCRIPTIONS].find(
                (d) => d.channel_id === (item.channel_id || item.id)
              );
              return {
                ...item,
                channel_title: matchedDefault ? matchedDefault.channel_title : "",
                name: matchedDefault ? matchedDefault.channel_title : "",
              };
            }
            return item;
          });
        }
      }
    } catch {}
  }

  return language === "EN" ? DEFAULT_EN_SUBSCRIPTIONS : DEFAULT_DE_SUBSCRIPTIONS;
}

// Добавление новой подписки (с защитой от записи плейсхолдера "Канал")
export async function addSubscriptionToDb(
  sub: Omit<Subscription, "id" | "created_at">
): Promise<Subscription | null> {
  try {
    let cleanTitle = (sub.channel_title || sub.name || "").trim();
    if (
      !cleanTitle ||
      cleanTitle.toLowerCase() === "канал" ||
      cleanTitle.toLowerCase() === "undefined"
    ) {
      const matchedDefault = [...DEFAULT_DE_SUBSCRIPTIONS, ...DEFAULT_EN_SUBSCRIPTIONS].find(
        (d) => d.channel_id === sub.channel_id
      );
      cleanTitle = matchedDefault ? matchedDefault.channel_title : "";
      if (!cleanTitle && sub.channel_id && sub.channel_id.startsWith("UC")) {
        cleanTitle = await resolveChannelTitleById(sub.channel_id);
      }
    }

    const payload = {
      channel_id: sub.channel_id,
      channel_title: cleanTitle,
      channel_thumbnail: sub.channel_thumbnail || "",
      language: sub.language,
    };

    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(payload, { onConflict: "channel_id,language" })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Ошибка сохранения подписки в БД:", err);
    return null;
  }
}

// Удаление подписки
export async function removeSubscriptionFromDb(
  channelId: string,
  language: "DE" | "EN"
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("channel_id", channelId)
      .eq("language", language);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Ошибка удаления подписки из БД:", err);
    return false;
  }
}

/**
 * Очистка закэшированных данных в LocalStorage и Supabase от плейсхолдеров "Канал"
 */
export async function cleanSubscriptionsAndCache(): Promise<void> {
  if (typeof window === "undefined") return;

  const storageKeys = [
    "cached_subscriptions_de",
    "cached_subscriptions_en",
    "custom_videos_de",
    "custom_videos_en",
    "subscriptions_de",
    "subscriptions_en",
    "yt_de_subscriptions",
    "yt_en_subscriptions",
  ];

  for (const key of storageKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) continue;

      let hasChanges = false;
      const updated = await Promise.all(
        parsed.map(async (item: any) => {
          if (!item || typeof item !== "object") return item;

          const rawTitle = (item.channel_title || item.channel || item.name || "").trim();
          const isPlaceholder =
            !rawTitle ||
            rawTitle.toLowerCase() === "канал" ||
            rawTitle.toLowerCase() === "undefined";

          if (isPlaceholder) {
            hasChanges = true;
            let resolved = "";
            const channelId = item.channel_id || item.id;
            const videoId = item.youtube_id || item.id;

            // 1. Попытка восстановить из дефолтов
            const matchedDefault = [...DEFAULT_DE_SUBSCRIPTIONS, ...DEFAULT_EN_SUBSCRIPTIONS].find(
              (d) => d.channel_id === channelId
            );
            if (matchedDefault) {
              resolved = matchedDefault.channel_title;
            }

            // 2. Попытка резолва по channelId
            if (!resolved && channelId && String(channelId).startsWith("UC")) {
              resolved = await resolveChannelTitleById(String(channelId));
            }

            // 3. Попытка резолва по videoId
            if (!resolved && videoId && !String(videoId).startsWith("UC")) {
              resolved = await resolveChannelName(String(videoId), item.title);
            }

            return {
              ...item,
              channel: resolved,
              channel_title: resolved,
              name: resolved,
            };
          }
          return item;
        })
      );

      if (hasChanges) {
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {
      console.error(`Ошибка очистки ключа ${key}:`, e);
    }
  }

  // Очистка записей в Supabase с channel_title = 'Канал' или 'undefined'
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .or("channel_title.eq.Канал,channel_title.eq.undefined,channel_title.eq.");

    if (!error && data && data.length > 0) {
      for (const row of data) {
        let realTitle = "";
        const matchedDefault = [...DEFAULT_DE_SUBSCRIPTIONS, ...DEFAULT_EN_SUBSCRIPTIONS].find(
          (d) => d.channel_id === row.channel_id
        );
        if (matchedDefault) {
          realTitle = matchedDefault.channel_title;
        } else if (row.channel_id && row.channel_id.startsWith("UC")) {
          realTitle = await resolveChannelTitleById(row.channel_id);
        }

        if (realTitle) {
          await supabase
            .from("subscriptions")
            .update({ channel_title: realTitle })
            .eq("id", row.id);
        }
      }
    }
  } catch (err) {
    console.error("Ошибка обновления Supabase subscriptions:", err);
  }
}
