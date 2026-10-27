"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, BookMarked } from "lucide-react";
import { useYouTube } from "@/context/YouTubeContext";

export default function YouTubeHeader() {
  const { openDictionary, savedWords } = useYouTube();

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-[#141414]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 md:px-10 py-3.5 flex items-center justify-between">
      {/* LEFT: Return to Netflix button */}
      <div className="flex items-center">
        <Link
          className="flex items-center gap-2 text-xs md:text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
          href="/"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Вернуться в Netflix</span>
          <span className="sm:hidden">Netflix</span>
        </Link>
      </div>

      {/* CENTER: Netflix Learning // YouTube DE Logo */}
      <div className="flex items-center gap-2 select-none">
        <Link href="/youtube" className="flex items-center gap-2.5">
          {/* Netflix Red N/Logo */}
          <span className="font-extrabold tracking-tighter text-[#E50914] text-lg md:text-xl">
            NETFLIX
          </span>
          <span className="text-zinc-600 font-light text-sm hidden md:inline">|</span>
          <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-zinc-200">
            LEARNING
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#E50914] text-white tracking-widest uppercase">
            YOUTUBE DE
          </span>
        </Link>
      </div>

      {/* RIGHT: Flashcards / Dictionary button */}
      <div className="flex items-center">
        <button
          onClick={openDictionary}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-red-600/50 text-white font-semibold text-xs md:text-sm transition-all shadow-md cursor-pointer group"
        >
          <BookMarked className="w-4 h-4 text-[#E50914] group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Мой словарь</span>
          {savedWords.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-600/20 border border-red-500/40 text-[11px] font-bold text-red-400">
              {savedWords.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
