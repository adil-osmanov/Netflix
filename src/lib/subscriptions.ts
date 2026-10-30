import { createClient } from "@supabase/supabase-js";

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
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `cached_subscriptions_${language.toLowerCase()}`,
          JSON.stringify(data)
        );
      }
      return data;
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
          return parsed;
        }
      }
    } catch {}
  }

  return language === "EN" ? DEFAULT_EN_SUBSCRIPTIONS : DEFAULT_DE_SUBSCRIPTIONS;
}

// Добавление новой подписки
export async function addSubscriptionToDb(
  sub: Omit<Subscription, "id" | "created_at">
): Promise<Subscription | null> {
  try {
    const payload = {
      channel_id: sub.channel_id,
      channel_title: sub.channel_title,
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
