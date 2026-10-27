import { YouTubeRecommendedVideo } from "@/types/youtube";

export const RECOMMENDED_YOUTUBE_VIDEOS: YouTubeRecommendedVideo[] = [
  // Easy German
  {
    id: "-4o4S6M6QcE",
    title: "How Foreigners Become Skilled Workers in Germany",
    channel: "Easy German",
    level: "B1",
    thumbnailUrl: "https://img.youtube.com/vi/-4o4S6M6QcE/hqdefault.jpg",
    description: "Разговорный немецкий на улицах Берлина: истории иностранцев о работе и жизни в Германии.",
    durationText: "12 мин",
  },
  {
    id: "-WbwNgcUT2o",
    title: "Learn German with Our Live Podcast",
    channel: "Easy German",
    level: "B1",
    thumbnailUrl: "https://img.youtube.com/vi/-WbwNgcUT2o/hqdefault.jpg",
    description: "Живое обсуждение актуальных тем и немецкой культуры в формате подкаста с четким произношением.",
    durationText: "24 мин",
  },

  // WDR Doku
  {
    id: "FmwxHil9nDE",
    title: "Wechseljahre: Viele Symptome, wenig Hilfe",
    channel: "WDR Doku",
    level: "B2",
    thumbnailUrl: "https://img.youtube.com/vi/FmwxHil9nDE/hqdefault.jpg",
    description: "Глубокий документальный репортаж от WDR с богатой лексикой и аутентичной немецкой речью.",
    durationText: "44 мин",
  },
  {
    id: "Jji8l37mX4Y",
    title: "Die Angst fährt mit: Wie sicher sind wir in Bus und Bahn?",
    channel: "WDR Doku",
    level: "B2",
    thumbnailUrl: "https://img.youtube.com/vi/Jji8l37mX4Y/hqdefault.jpg",
    description: "Актуальное расследование WDR о безопасности общественного транспорта в Германии.",
    durationText: "30 мин",
  },

  // DW Deutsch lernen
  {
    id: "_buguiVte80",
    title: "Deutsch lernen mit Videos: Nachrichten leicht verständlich",
    channel: "DW Deutsch lernen",
    level: "B1",
    thumbnailUrl: "https://img.youtube.com/vi/_buguiVte80/hqdefault.jpg",
    description: "Краткий новостной выпуск на понятном немецком языке с идеальной дикцией дикторов Deutsche Welle.",
    durationText: "4 мин",
  },
  {
    id: "sXeHoU9fbkA",
    title: "Top-Thema mit Vokabeln: Weltgeschehen verstehen",
    channel: "DW Deutsch lernen",
    level: "B1",
    thumbnailUrl: "https://img.youtube.com/vi/sXeHoU9fbkA/hqdefault.jpg",
    description: "Образовательные сюжеты от DW с акцентом на понимание на слух и расширение словарного запаса.",
    durationText: "6 мин",
  },

  // MrWissen2go
  {
    id: "o8rZ7rmTQiU",
    title: "Die CDU stürzt ab. Das sind die Gründe!",
    channel: "MrWissen2go",
    level: "B2",
    thumbnailUrl: "https://img.youtube.com/vi/o8rZ7rmTQiU/hqdefault.jpg",
    description: "Политический и общественный анализ от Mirko Drotschmann с понятными объяснениями сложных терминов.",
    durationText: "14 мин",
  },
  {
    id: "nrnpcqzhd44",
    title: "Proteste & Gewalt! Was ist los in Frankreich?",
    channel: "MrWissen2go",
    level: "B2",
    thumbnailUrl: "https://img.youtube.com/vi/nrnpcqzhd44/hqdefault.jpg",
    description: "Информативный разбор международных событий с четкой структурой и аргументацией.",
    durationText: "11 мин",
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
