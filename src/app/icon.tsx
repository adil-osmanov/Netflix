import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          borderRadius: '115px', // Скругление Apple Squircle для Dock
        }}
      >
        <svg
          width="260"
          height="380"
          viewBox="0 0 111 162"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Левая вертикальная полоса */}
          <path d="M0 0H33.4V162H0V0Z" fill="#B81D24" />
          {/* Правая вертикальная полоса */}
          <path d="M77.6 0H111V162H77.6V0Z" fill="#B81D24" />
          {/* Диагональная лента с фирменной тенью */}
          <path d="M0 0H33.4L111 162H77.6L0 0Z" fill="#E50914" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
