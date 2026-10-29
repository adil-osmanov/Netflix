"use client";

import React from "react";
import { NetflixLogo } from "@/components/common/NetflixLogo";

export default function YouTubeHeader() {
  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-black/95 backdrop-blur-md py-3.5 flex items-center justify-center">
      <NetflixLogo className="h-6 sm:h-7" />
    </header>
  );
}
