export interface ChannelConfig {
  id: string;
  label: string;
  aliases: string[];
  group: 'main' | 'regional' | 'special' | 'dach';
}

export const ALL_CHANNELS: ChannelConfig[] = [
  // Главные национальные каналы
  { id: 'ARD', label: 'ARD (Das Erste)', aliases: ['ARD', 'Das Erste', 'daserste', 'DasErste'], group: 'main' },
  { id: 'ZDF', label: 'ZDF', aliases: ['ZDF', 'zdf'], group: 'main' },
  { id: 'ARTE', label: 'ARTE', aliases: ['ARTE', 'Arte.DE', 'arte', 'ARTE.de', 'Arte'], group: 'main' },
  { id: '3SAT', label: '3Sat', aliases: ['3Sat', '3sat', '3SAT'], group: 'main' },

  // Региональные каналы ARD (Landesrundfunkanstalten)
  { id: 'BR', label: 'BR', aliases: ['BR', 'Bayerischer Rundfunk', 'br', 'BR Fernsehen'], group: 'regional' },
  { id: 'SWR', label: 'SWR', aliases: ['SWR', 'Südwestrundfunk', 'swr', 'SWR Fernsehen'], group: 'regional' },
  { id: 'WDR', label: 'WDR', aliases: ['WDR', 'Westdeutscher Rundfunk', 'wdr', 'WDR Fernsehen'], group: 'regional' },
  { id: 'NDR', label: 'NDR', aliases: ['NDR', 'Norddeutscher Rundfunk', 'ndr', 'NDR Fernsehen'], group: 'regional' },
  { id: 'MDR', label: 'MDR', aliases: ['MDR', 'Mitteldeutscher Rundfunk', 'mdr', 'MDR Fernsehen'], group: 'regional' },
  { id: 'HR', label: 'HR', aliases: ['HR', 'Hessischer Rundfunk', 'hr-fernsehen', 'hr', 'hr Fernsehen'], group: 'regional' },
  { id: 'RBB', label: 'RBB', aliases: ['RBB', 'rbb Fernsehen', 'rbb', 'rbb-fernsehen'], group: 'regional' },
  { id: 'SR', label: 'SR', aliases: ['SR', 'Saarländischer Rundfunk', 'sr-fernsehen', 'SR Fernsehen'], group: 'regional' },
  { id: 'RADIO_BREMEN', label: 'Radio Bremen', aliases: ['Radio Bremen', 'RB', 'radiobremen', 'RadioBremen'], group: 'regional' },

  // Тематические и молодежные каналы
  { id: 'ZDF_NEO', label: 'ZDFneo', aliases: ['ZDFneo', 'zdf_neo', 'zdfneo', 'ZDF_neo'], group: 'special' },
  { id: 'ZDF_INFO', label: 'ZDFinfo', aliases: ['ZDFinfo', 'zdf_info', 'zdfinfo', 'ZDF_info'], group: 'special' },
  { id: 'ONE', label: 'ONE', aliases: ['ONE', 'one', 'ard-one', 'ARD-One'], group: 'special' },
  { id: 'TAGESSCHAU24', label: 'Tagesschau24', aliases: ['tagesschau24', 'Tagesschau 24', 'Tagesschau24'], group: 'special' },
  { id: 'PHOENIX', label: 'Phoenix', aliases: ['PHOENIX', 'phoenix', 'Phoenix'], group: 'special' },
  { id: 'KIKA', label: 'KiKa', aliases: ['KiKa', 'kika', 'KI.KA', 'KIKA', 'ZDF-tivi'], group: 'special' },
  { id: 'DW', label: 'Deutsche Welle', aliases: ['DW', 'Deutsche Welle', 'dw', 'DeutscheWelle'], group: 'special' },

  // Дружественные каналы DACH (Австрия / Швейцария)
  { id: 'ORF', label: 'ORF', aliases: ['ORF', 'orf', 'ORF1', 'ORF2', 'ORF 1', 'ORF 2'], group: 'dach' },
  { id: 'SRF', label: 'SRF', aliases: ['SRF', 'srf', 'SRF1', 'SRF zwei', 'SRF 1', 'SRF 2'], group: 'dach' }
];

/**
 * Нормализация вещателя из API к чистому ID канала
 */
export function normalizeSender(rawSender: string): string {
  if (!rawSender) return 'ARD';
  const clean = rawSender.replace(/^mediathek[-\s_]*/i, '').trim();
  const upper = clean.toUpperCase();

  // 1. Точное совпадение по ID
  for (const channel of ALL_CHANNELS) {
    if (channel.id.toUpperCase() === upper) return channel.id;
  }

  // 2. Точное совпадение по алиасам
  for (const channel of ALL_CHANNELS) {
    for (const alias of channel.aliases) {
      if (alias.toUpperCase() === upper) {
        return channel.id;
      }
    }
  }

  // 3. Частичное совпадение
  for (const channel of ALL_CHANNELS) {
    for (const alias of channel.aliases) {
      const aUpper = alias.toUpperCase();
      if (upper.includes(aUpper) || aUpper.includes(upper)) {
        return channel.id;
      }
    }
  }

  return clean || 'ARD';
}

/**
 * Короткий брендовый заголовок для бейджа на карточке (например: ARTE, ZDF, BR, 3Sat)
 */
export function getSenderBadgeLabel(rawSender: string): string {
  const normId = normalizeSender(rawSender);
  const found = ALL_CHANNELS.find((c) => c.id === normId);
  if (found) {
    if (found.id === 'ARD') return 'ARD';
    if (found.id === '3SAT') return '3Sat';
    if (found.id === 'ZDF_NEO') return 'ZDFneo';
    if (found.id === 'ZDF_INFO') return 'ZDFinfo';
    if (found.id === 'RADIO_BREMEN') return 'Radio Bremen';
    if (found.id === 'TAGESSCHAU24') return 'Tagesschau24';
    if (found.id === 'KIKA') return 'KiKa';
    if (found.id === 'DW') return 'DW';
    if (found.id === 'PHOENIX') return 'Phoenix';
    return found.id;
  }

  const clean = rawSender.replace(/^mediathek[-\s_]*/i, '').trim();
  return clean || 'ARD';
}

/**
 * Цвет бейджа для языкового уровня
 */
export function getLevelBadgeColor(level?: string): string {
  const lvl = (level || '').toUpperCase();
  if (lvl === 'C1') return 'bg-red-600 text-white';
  if (lvl === 'B2') return 'bg-emerald-600 text-white';
  if (lvl === 'B1') return 'bg-cyan-600 text-white';
  if (lvl === 'A2') return 'bg-amber-600 text-white';
  if (lvl === 'A1') return 'bg-blue-600 text-white';
  return 'bg-zinc-800 text-zinc-100';
}

/**
 * Сопоставление ID кнопок интерфейса с реальными именами вещателей в MediathekViewWeb
 */
export const SENDER_API_MAP: Record<string, string> = {
  ARD: 'ARD',
  ZDF: 'ZDF',
  ARTE: 'ARTE.DE',       // В MediathekView немецкий Arte всегда ARTE.DE
  '3SAT': '3Sat',
  ZDF_NEO: 'ZDFneo',    // В API MediathekViewWeb
  BR: 'BR',
  SWR: 'SWR',
  WDR: 'WDR',
  NDR: 'NDR',
  MDR: 'MDR',
  HR: 'HR',
  RBB: 'RBB',
  SR: 'SR',
  PHOENIX: 'PHOENIX',    // Строго капсом
  ONE: 'ONE',
  DW: 'DW',
  ORF: 'ORF',
  SRF: 'SRF',
  KIKA: 'KiKa',
  TAGESSCHAU24: 'Tagesschau24',
  RADIO_BREMEN: 'Radio Bremen',
  ZDF_INFO: 'ZDFinfo',
};

/**
 * Реальный алгоритм классификации уровней языка (A1–C1)
 */
export function determineGermanLevel(video: {
  title: string;
  topic?: string;
  description?: string;
  sender?: string;
  channel?: string;
  duration?: number;
}): 'A1' | 'A2' | 'B1' | 'B2' | 'C1' {
  const text = `${video.title || ''} ${video.topic || ''} ${video.description || ''}`.toLowerCase();
  const sender = (video.sender || video.channel || '').toUpperCase();

  // A1: Простейший детский контент, медленная речь с артикуляцией, передачи на упрощенном немецком
  if (
    text.includes('einfache sprache') ||
    text.includes('sesamstraße') ||
    text.includes('sandmännchen') ||
    text.includes('die sendung mit der maus') ||
    text.includes('elefant') ||
    text.includes('kika') ||
    text.includes('deutsch lernen a1') ||
    sender.includes('KIKA')
  ) {
    return 'A1';
  }

  // A2: Познавательные передачи для детей и подростков, визуальные шоу, четкая артикуляция
  if (
    text.includes('checker') || // Checker Tobi, Checker Can, Checker Julian
    text.includes('löwenzahn') ||
    text.includes('logo!') || // Детские новости с простыми терминами
    text.includes('wissen macht ah') ||
    text.includes('pur+') ||
    text.includes('anna und die wilden tiere') ||
    text.includes('neuneinhalb')
  ) {
    return 'A2';
  }

  // B1: Репортажи о ремеслах, природе, путешествиях и простые новости
  if (
    text.includes('handwerkskunst') ||
    text.includes('wdr reisen') ||
    text.includes('kurzgesagt') ||
    text.includes('terra xpress') ||
    text.includes('tagesschau') ||
    text.includes('mittagsmagazin') ||
    text.includes('servicezeit') ||
    text.includes('markt')
  ) {
    return 'B1';
  }

  // B2: Научно-популярные фильмы, аналитические документалки, история
  if (
    text.includes('terra x') ||
    text.includes('zdfinfo') ||
    text.includes('planb') ||
    text.includes('auslandsjournal') ||
    text.includes('odysso') ||
    text.includes('lesch') ||
    text.includes('nano') ||
    sender.includes('ARTE')
  ) {
    return 'B2';
  }

  // C1: Художественные фильмы, криминальные драмы, ток-шоу, дебаты носителей на полной скорости
  // Spielfilm, Tatort, Maybrit Illner, Markus Lanz, Hart aber fair
  return 'C1';
}

/**
 * Строгая проверка и фильтрация видео без реальных обложек
 */
export function filterValidMediathekVideos<T extends {
  thumbnail?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  preview_url?: string;
  poster?: string;
  posterUrl?: string;
}>(videos: T[]): T[] {
  return videos.filter((video) => {
    const thumb =
      video.thumbnail ||
      video.thumbnailUrl ||
      video.imageUrl ||
      video.preview_url ||
      video.poster ||
      video.posterUrl;
    if (!thumb || typeof thumb !== 'string') return false;
    const clean = thumb.trim();
    return (
      clean.length > 12 &&
      !clean.startsWith('data:image/svg') &&
      !clean.includes('default_placeholder') &&
      !clean.includes('empty_thumb') &&
      (clean.startsWith('http://') || clean.startsWith('https://'))
    );
  });
}

