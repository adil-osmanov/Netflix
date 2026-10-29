"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FullscreenToggle from "@/components/layout/FullscreenToggle";

export default function YouTubeHeader() {
  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-[#141414]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 pl-20 md:px-10 md:pl-20 py-3.5 flex items-center justify-between">
      {/* Слева */}
      <div className="flex items-center">
        <Link
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-medium transition-colors select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
          href="/"
        >
          <ArrowLeft size={16} />
          <span>Назад</span>
        </Link>
      </div>

      {/* По центру */}
      <div className="flex items-center gap-2 select-none">
        <span className="text-red-600 font-black tracking-widest text-lg sm:text-xl">NETFLIX</span>
      </div>

      {/* Справа: переключатель полного экрана */}
      <div className="flex items-center justify-end">
        <FullscreenToggle />
      </div>
    </header>
  );
}
