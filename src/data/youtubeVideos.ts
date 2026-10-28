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
  "DW Deutsch": {
    id: "UCxUWIEL-USsiPak0Qy6_vVg",
    name: "DW Deutsch lernen",
    handle: "@dwdeutschlernen",
    defaultLevel: "B1",
  },
  "MrWissen2go": {
    id: "UCZHpIFMfoJJ_1QxNGLJTzyA",
    name: "MrWissen2go",
    handle: "@MrWissen2go",
    defaultLevel: "B2",
  },
  "WDR Doku": {
    id: "UCUuab1dctZzN5ZmRmQnTzkg",
    name: "WDR Doku",
    handle: "@WDRDoku",
    defaultLevel: "B2",
  },
  "SWR Handwerkskunst": {
    id: "UC4-a6QWRyBlzTFGdS-T_wfw",
    name: "SWR Handwerkskunst",
    handle: "@Handwerkskunst",
    defaultLevel: "B1",
  },
  "Simplicissimus": {
    id: "UCKGMHVipEvuZudhHD05FOYA",
    name: "Simplicissimus",
    handle: "@Simplicissimus",
    defaultLevel: "B2",
  },
  "Quarks": {
    id: "UC1Y7onDsPyfP-lu--SXF-ew",
    name: "Quarks",
    handle: "@Quarks",
    defaultLevel: "B2",
  },
  "Galileo": {
    id: "UC3dc11Xl5Iq_K4e5j-WdO_A",
    name: "Galileo",
    handle: "@Galileo",
    defaultLevel: "B1",
  },
  "Deutsch mit Marija": {
    id: "UCCAI6jmeW5hWz2-jaLPqLUQ",
    name: "Deutsch mit Marija",
    handle: "@DeutschmitMarija",
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

  // 2. DW Deutsch lernen (B1)
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

  // 3. MrWissen2go (B2)
  {
    id: "o8rZ7rmTQiU",
    title: "Die CDU stürzt ab. Das sind die Gründe!",
    channel: "MrWissen2go",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/o8rZ7rmTQiU/hqdefault.jpg",
    description: "Политический и общественный анализ от Mirko Drotschmann с понятными объяснениями сложных терминов.",
    durationText: "14 мин",
  },
  {
    id: "nrnpcqzhd44",
    title: "Proteste & Gewalt! Was ist los in Frankreich?",
    channel: "MrWissen2go",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/nrnpcqzhd44/hqdefault.jpg",
    description: "Информативный разбор международных событий с четкой структурой и аргументацией.",
    durationText: "11 мин",
  },
  {
    id: "lz2k08ZU9qQ",
    title: "Krise in UK! Könnte das Vereinigte Königreich zerbrechen?",
    channel: "MrWissen2go",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/lz2k08ZU9qQ/hqdefault.jpg",
    description: "Аналитический обзор европейской политики и институтов власти.",
    durationText: "15 мин",
  },

  // 4. WDR Doku (B2)
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

  // 5. Simplicissimus (B2)
  {
    id: "zNXG30YFVao",
    title: "Das Nordkorea mitten in Europa",
    channel: "Simplicissimus",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/zNXG30YFVao/hqdefault.jpg",
    description: "Увлекательное видеоэссе о геополитических аномалиях Европы с четким дикторским голосом.",
    durationText: "18 мин",
  },
  {
    id: "HHuIcNUFpbI",
    title: "Wie die AfD ausspioniert wurde",
    channel: "Simplicissimus",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/HHuIcNUFpbI/hqdefault.jpg",
    description: "Журналистское расследование и цифровой анализ с живой современной немецкой лексикой.",
    durationText: "21 мин",
  },
  {
    id: "3eJ2KhzWZVM",
    title: "Wie dieser Junge die USA gehackt hat",
    channel: "Simplicissimus",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/3eJ2KhzWZVM/hqdefault.jpg",
    description: "Захватывающая история кибербезопасности с понятной терминологией и быстрым темпом речи.",
    durationText: "19 мин",
  },

  // 6. Quarks (B2)
  {
    id: "bTxGE4B3TBE",
    title: "Neue Daten: Deutsche schlafen zu wenig - und merken es nicht",
    channel: "Quarks",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/bTxGE4B3TBE/hqdefault.jpg",
    description: "Научно-популярный разбор от WDR Quarks: сон, здоровье и биоритмы человека.",
    durationText: "16 мин",
  },
  {
    id: "kbIuZPZJUzQ",
    title: "Was jetzt noch gegen das E-Auto spricht | Studio Q",
    channel: "Quarks",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/kbIuZPZJUzQ/hqdefault.jpg",
    description: "Факты, исследования и статистика об экологии и будущем автомобилестроения.",
    durationText: "15 мин",
  },
  {
    id: "v_ipTF1yaHs",
    title: "Neues Gesetz: Was Betroffene jetzt wissen müssen | Studio Q",
    channel: "Quarks",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/v_ipTF1yaHs/hqdefault.jpg",
    description: "Юридический и научный взгляд на новые реформы и правила в ФРГ.",
    durationText: "14 мин",
  },

  // 7. SWR Handwerkskunst (B1)
  {
    id: "j8-g7q2-XaI",
    title: "Wie man gesundes Gemüse anbaut | Handwerkskunst!",
    channel: "SWR Handwerkskunst",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/j8-g7q2-XaI/hqdefault.jpg",
    description: "Традиционное немецкое ремесло, спокойный размеренный темп речи и практическая лексика.",
    durationText: "30 мин",
  },
  {
    id: "yoLq9vxuLjs",
    title: "Wie man Öl macht | Handwerkskunst!",
    channel: "SWR Handwerkskunst",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/yoLq9vxuLjs/hqdefault.jpg",
    description: "Искусство производства органического масла: идеальное произношение и наглядные действия.",
    durationText: "28 мин",
  },
  {
    id: "Xr0BF0a1yoM",
    title: "Wie man mit Hanf baut | Handwerkskunst!",
    channel: "SWR Handwerkskunst",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/Xr0BF0a1yoM/hqdefault.jpg",
    description: "Экологическое строительство и плотницкое мастерство в Германии.",
    durationText: "29 мин",
  },

  // 8. Deutsch mit Marija (B1)
  {
    id: "wvBg5LAKmWM",
    title: "Wort vergessen? Informelle Umschreibungen",
    channel: "Deutsch mit Marija",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/wvBg5LAKmWM/hqdefault.jpg",
    description: "Практические советы для разговорной речи: как выкрутиться, если забыл нужное слово.",
    durationText: "12 мин",
  },
  {
    id: "ByRX3I1anBk",
    title: "Die wichtigste Fähigkeit für fließendes Deutsch",
    channel: "Deutsch mit Marija",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/ByRX3I1anBk/hqdefault.jpg",
    description: "Разбор психологических барьеров и упражнений для уверенного говорения на немецком.",
    durationText: "11 мин",
  },
  {
    id: "FKYoStbEYjU",
    title: "Kreative Betrachtung eines Farbstiftes: Wortschatz erweitern",
    channel: "Deutsch mit Marija",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/FKYoStbEYjU/hqdefault.jpg",
    description: "Интересная методика расширения словарного запаса через детальное описание предметов.",
    durationText: "13 мин",
  },

  // 9. Galileo (B1/B2)
  {
    id: "bUo0h_1Z1o0",
    title: "Wie entsteht eigentlich ein Döner? | Galileo",
    channel: "Galileo",
    level: "B1",
    thumbnailUrl: "https://i.ytimg.com/vi/bUo0h_1Z1o0/hqdefault.jpg",
    description: "Galileo blickt hinter die Kulissen der Dönerproduktion in Deutschland.",
    durationText: "14 мин",
  },
  {
    id: "gN7T23Y74OQ",
    title: "Das teuerste Restaurant der Welt | Galileo",
    channel: "Galileo",
    level: "B2",
    thumbnailUrl: "https://i.ytimg.com/vi/gN7T23Y74OQ/hqdefault.jpg",
    description: "Galileo testet kulinarische Meisterwerke und exklusive Gerichte.",
    durationText: "16 мин",
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
