"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FullscreenToggle from "@/components/layout/FullscreenToggle";

export default function YouTubeHeader() {
  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-[#141414]/95 backdrop-blur-md px-4 sm:px-6 md:px-10 py-3 flex items-center justify-between">
      {/* Слева: кнопка Назад */}
      <div className="flex items-center z-10">
        <Link
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-medium transition-colors select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
          href="/"
        >
          <ArrowLeft size={16} />
          <span>Назад</span>
        </Link>
      </div>

      {/* По центру: строго геометрически по центру экрана */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center select-none pointer-events-auto">
        <Link
          href="/"
          className="text-red-600 hover:text-red-500 transition-colors font-black tracking-widest text-lg sm:text-xl select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
        >
          NETFLIX
        </Link>
      </div>

      {/* Справа: переключатель полного экрана */}
      <div className="flex items-center justify-end z-10">
        <FullscreenToggle />
      </div>
    </header>
  );
}
