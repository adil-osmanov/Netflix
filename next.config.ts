import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Разрешаем прямую загрузку картинок с любых доменов немецких и международных CDN
    remotePatterns: [
      { protocol: 'https', hostname: '**.arte.tv' },
      { protocol: 'https', hostname: '**.ardmediathek.de' },
      { protocol: 'https', hostname: '**.zdf.de' },
      { protocol: 'https', hostname: '**.br.de' },
      { protocol: 'https', hostname: '**.swr.de' },
      { protocol: 'https', hostname: '**.wdr.de' },
      { protocol: 'https', hostname: '**.ndr.de' },
      { protocol: 'https', hostname: '**.mdr.de' },
      { protocol: 'https', hostname: '**.orf.at' },
      { protocol: 'https', hostname: '**.srf.ch' },
      { protocol: 'https', hostname: '**' }, // Wildcard для остальных медиа-серверов
      { protocol: 'http', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
