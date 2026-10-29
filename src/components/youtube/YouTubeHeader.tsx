"use client";

import React from "react";
import { NetflixLogo } from "@/components/common/NetflixLogo";

export default function YouTubeHeader() {
  return (
    <header className="relative w-full py-4 flex items-center justify-center">
      <NetflixLogo className="h-7 sm:h-8" />
    </header>
  );
}
