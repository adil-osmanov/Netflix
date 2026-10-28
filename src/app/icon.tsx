import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 340,
          background: '#09090b',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e50914',
          fontWeight: 900,
          fontFamily: 'sans-serif',
          borderRadius: '110px',
          border: '16px solid #27272a',
        }}
      >
        N
      </div>
    ),
    { ...size }
  );
}
