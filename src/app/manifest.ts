import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Netflix Deutsch',
    short_name: 'Netflix DE',
    description: 'B1-B2 German Video Curator',
    start_url: '/youtube',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#e50914',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
