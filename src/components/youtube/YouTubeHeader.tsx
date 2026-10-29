"use client";

import React from "react";
import Link from "next/link";

export default function YouTubeHeader() {
  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-black/95 backdrop-blur-md py-3.5 flex items-center justify-center">
      <Link
        className="text-2xl sm:text-3xl font-black tracking-tighter text-[#E50914] select-none uppercase hover:opacity-90 transition-opacity outline-none [-webkit-tap-highlight-color:transparent]"
        href="/"
      >
        NETFLIX
      </Link>
    </header>
  );
}
