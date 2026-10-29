import React from 'react';
import Link from 'next/link';

interface NetflixLogoProps {
  className?: string;
  onClick?: () => void;
}

export function NetflixLogo({ className = "h-6 sm:h-7", onClick }: NetflixLogoProps) {
  return (
    <Link
      className="inline-flex items-center outline-none select-none hover:opacity-90 transition-opacity [-webkit-tap-highlight-color:transparent]"
      href="/"
      onClick={onClick}
      aria-label="Netflix"
    >
      <svg
        className={`${className} w-auto`}
        viewBox="0 0 111 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M105.062 14.2807L111 30C109.123 29.8333 107.246 29.693 105.369 29.5877L101.404 18.9123L97.4386 29.1667C95.6667 29.0965 93.8947 29.0439 92.1053 29.0263L98.5439 14.2807L92.9825 0H98.614L101.754 8.77193L104.912 0H110.544L105.062 14.2807Z"
          fill="#E50914"
        />
        <path
          d="M86.8421 0V28.9298C85.1228 28.9474 83.4035 28.9825 81.6842 29.0439V0H86.8421Z"
          fill="#E50914"
        />
        <path
          d="M71.0526 4.98246H77.193V0H65.8947V29.2895C67.614 29.2018 69.3333 29.1316 71.0526 29.0789V4.98246Z"
          fill="#E50914"
        />
        <path
          d="M57.8947 18.0702H51.7544V29.693C50.0351 29.8158 48.3158 29.9561 46.5965 30.1228V0H57.8947V4.98246H51.7544V13.0877H57.8947V18.0702Z"
          fill="#E50914"
        />
        <path
          d="M40.3509 25.1053H44.7368V30.5439C41.7719 30.9825 38.807 31.4737 35.8421 32.0175V0H40.3509V25.1053Z"
          fill="#E50914"
        />
        <path
          d="M29.8246 18.0702H23.6842V33.1579C21.9649 33.5263 20.2456 33.9298 18.5263 34.3509V0H29.8246V4.98246H23.6842V13.0877H29.8246V18.0702Z"
          fill="#E50914"
        />
        <path
          d="M13.2632 14.5263L18.4211 0H13.6842L9.21053 14.0702V0H4.47368V38C6.91228 37.2807 9.35088 36.5263 11.7895 35.7368L13.2632 14.5263Z"
          fill="#E50914"
        />
        <path
          d="M0 0V39.4211C1.49123 38.9123 2.98246 38.4211 4.47368 37.9474V0H0Z"
          fill="#B81D24"
        />
      </svg>
    </Link>
  );
}

export default NetflixLogo;
