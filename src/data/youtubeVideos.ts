import { YouTubeRecommendedVideo } from "@/types/youtube";

export interface ChannelInfo {
  id: string;
  name: string;
  handle: string;
  defaultLevel: "B1" | "B2";
}

export const CORE_CHANNELS: Record<string, ChannelInfo> = {
  "Easy German": {
    id: "UCbxb2fqe9oNgglAoYqsYOtQ",
    name: "Easy German",
    handle: "@EasyGerman",
    defaultLevel: "B1",
  },
  "WDR Doku": {
    id: "UCUuab1dctZzN5ZmRmQnTzkg",
    name: "WDR Doku",
    handle: "@WDRDoku",
    defaultLevel: "B2",
  },
  "DW Deutsch": {
    id: "UCxUWIEL-USsiPak0Qy6_vVg",
    name: "DW Deutsch lernen",
    handle: "@dwdeutschlernen",
    defaultLevel: "B1",
  },
  "MrWissen2go": {
    id: "UCsVWpmoBs4We3RhwExtfGVA",
    name: "MrWissen2go Geschichte",
    handle: "@MrWissen2goGeschichte",
    defaultLevel: "B2",
  },
  "Terra X": {
    id: "UCA3mpqm67CpJ13YdqJx_42Q",
    name: "Terra X Doku",
    handle: "@TerraXDoku",
    defaultLevel: "B2",
  },
  "SWR Handwerkskunst": {
    id: "UC9ecmp3fyh0t7sYphve0qCw",
    name: "SWR Handwerkskunst",
    handle: "@Handwerkskunst",
    defaultLevel: "B1",
  },
};

export const RECOMMENDED_YOUTUBE_VIDEOS: YouTubeRecommendedVideo[] = [
  // 1. Easy German (B1)
  {
    id: "-4o4S6M6QcE",
    title: "How Foreigners Become Skilled Workers in Germany",
    channel: "Easy German",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/-4o4S6M6QcE/hqdefault.jpg",
    description: "Разговорный немецкий на улицах Берлина: истории иностранцев о работе и жизни в Германии.",
    durationText: "12 мин",
  },
  {
    id: "-WbwNgcUT2o",
    title: "Learn German with Our Live Podcast",
    channel: "Easy German",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/-WbwNgcUT2o/hqdefault.jpg",
    description: "Живое обсуждение актуальных тем и немецкой культуры в формате подкаста с четким произношением.",
    durationText: "24 мин",
  },
  {
    id: "5wK11fN6p3E",
    title: "Was macht dich glücklich? Street Interview",
    channel: "Easy German",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/5wK11fN6p3E/hqdefault.jpg",
    description: "Уличные интервью с носителями языка в Германии: естественная разговорная речь и повседневные фразы.",
    durationText: "10 мин",
  },
  {
    id: "7X1WpX4i4Xo",
    title: "Typisch Deutsch? Klischees im Check",
    channel: "Easy German",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/7X1WpX4i4Xo/hqdefault.jpg",
    description: "Разбор стереотипов о немцах с субтитрами: пунктуальность, порядок и привычки.",
    durationText: "15 мин",
  },

  // 2. WDR Doku (B2)
  {
    id: "FmwxHil9nDE",
    title: "Wechseljahre: Viele Symptome, wenig Hilfe | WDR Doku",
    channel: "WDR Doku",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/FmwxHil9nDE/hqdefault.jpg",
    description: "Глубокий документальный репортаж от WDR с богатой лексикой и аутентичной немецкой речью.",
    durationText: "44 мин",
  },
  {
    id: "Jji8l37mX4Y",
    title: "Die Angst fährt mit: Wie sicher sind wir in Bus und Bahn? | WDR Doku",
    channel: "WDR Doku",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/Jji8l37mX4Y/hqdefault.jpg",
    description: "Актуальное расследование WDR о безопасности общественного транспорта в Германии.",
    durationText: "30 мин",
  },
  {
    id: "d8E88ZkX4YI",
    title: "Leben am Limit: Junge Menschen in Not | WDR Doku",
    channel: "WDR Doku",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/d8E88ZkX4YI/hqdefault.jpg",
    description: "Социальный репортаж о вызовах и реалиях современной жизни молодежи в Германии.",
    durationText: "42 мин",
  },

  // 3. DW Deutsch lernen (B1)
  {
    id: "_buguiVte80",
    title: "Deutsch lernen mit Videos: Nachrichten leicht verständlich",
    channel: "DW Deutsch lernen",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/_buguiVte80/hqdefault.jpg",
    description: "Краткий новостной выпуск на понятном немецком языке с идеальной дикцией дикторов Deutsche Welle.",
    durationText: "4 мин",
  },
  {
    id: "sXeHoU9fbkA",
    title: "Top-Thema mit Vokabeln: Weltgeschehen verstehen",
    channel: "DW Deutsch lernen",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/sXeHoU9fbkA/hqdefault.jpg",
    description: "Образовательные сюжеты от DW с акцентом на понимание на слух и расширение словарного запаса.",
    durationText: "6 мин",
  },
  {
    id: "2b9vL3aB9oA",
    title: "Ticket nach Berlin: Abenteuer in Deutschland",
    channel: "DW Deutsch lernen",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/2b9vL3aB9oA/hqdefault.jpg",
    description: "Увлекательное реалити-путешествие изучающих немецкий язык по городам Германии.",
    durationText: "14 мин",
  },

  // 4. MrWissen2go Geschichte (B2)
  {
    id: "o8rZ7rmTQiU",
    title: "Die CDU stürzt ab. Das sind die Gründe!",
    channel: "MrWissen2go Geschichte",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/o8rZ7rmTQiU/hqdefault.jpg",
    description: "Политический и общественный анализ от Mirko Drotschmann с понятными объяснениями сложных терминов.",
    durationText: "14 мин",
  },
  {
    id: "nrnpcqzhd44",
    title: "Proteste & Gewalt! Was ist los in Frankreich?",
    channel: "MrWissen2go Geschichte",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/nrnpcqzhd44/hqdefault.jpg",
    description: "Информативный разбор международных событий с четкой структурой и аргументацией.",
    durationText: "11 мин",
  },
  {
    id: "6kQ9xK7W6Yo",
    title: "Der Kalte Krieg einfach erklärt | Geschichte",
    channel: "MrWissen2go Geschichte",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/6kQ9xK7W6Yo/hqdefault.jpg",
    description: "Исторический очерк с образной лексикой, наглядной инфографикой и академическим языком уровня B2.",
    durationText: "16 мин",
  },

  // 5. Terra X Doku (B2)
  {
    id: "7t3zN5rL6Eo",
    title: "Geheimnisse der Alpen: Naturwunder Europas | Terra X",
    channel: "Terra X Doku",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/7t3zN5rL6Eo/hqdefault.jpg",
    description: "Захватывающий документальный фильм ZDF о природе и тайнах альпийского региона.",
    durationText: "43 мин",
  },
  {
    id: "8kL7pQ2w3Yo",
    title: "Expedition Deutschland: Zeitreise durch Jahrhunderte",
    channel: "Terra X Doku",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/8kL7pQ2w3Yo/hqdefault.jpg",
    description: "История немецких земель от средневековья до современности с участием ведущих ученых.",
    durationText: "45 мин",
  },

  // 6. SWR Handwerkskunst (B1)
  {
    id: "9mP4wK2x5Lo",
    title: "Wie man ein echtes Holzfass baut | Handwerkskunst!",
    channel: "SWR Handwerkskunst",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/9mP4wK2x5Lo/hqdefault.jpg",
    description: "Традиционное немецкое ремесло, спокойный размеренный темп речи и практическая лексика.",
    durationText: "29 мин",
  },
  {
    id: "3xL8wK9p2Eo",
    title: "Wie man ein meisterhaftes Brot backt | Handwerkskunst!",
    channel: "SWR Handwerkskunst",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/3xL8wK9p2Eo/hqdefault.jpg",
    description: "Искусство выпечки традиционного немецкого хлеба: идеальное произношение и четкие описания процессов.",
    durationText: "30 мин",
  },
];

export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // Pure 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // URLs (youtube.com, youtu.be, shorts, embed)
  const match = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

export function extractYouTubeChannelId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // UC... 24-character ID
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/channel\/(UC[a-zA-Z0-9_-]{22})/i);
  return match ? match[1] : null;
}
