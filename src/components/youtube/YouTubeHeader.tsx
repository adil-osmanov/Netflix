"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark } from "lucide-react";
import { useYouTube } from "@/context/YouTubeContext";

export default function YouTubeHeader() {
  const { openDictionary, savedWords } = useYouTube();
  const openVocabulary = openDictionary;
  const wordsCount = savedWords.length;

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-[#141414]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 pl-20 md:px-10 md:pl-20 py-3.5 flex items-center justify-between">
      {/* Слева */}
      <div className="flex items-center">
        <Link
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-medium transition-colors"
          href="/"
        >
          <ArrowLeft size={14} />
          <span>В каталог фильмов</span>
        </Link>
      </div>

      {/* По центру */}
      <div className="flex items-center gap-2 select-none">
        <span className="font-black tracking-tighter text-red-600 text-lg">NETFLIX</span>
        <span className="text-zinc-600 text-xs">/</span>
        <span className="text-xs uppercase tracking-widest font-semibold text-zinc-300">YouTube DE</span>
      </div>

      {/* Справа */}
      <div className="flex items-center">
        <button
          onClick={openVocabulary}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 transition cursor-pointer"
        >
          <Bookmark className="text-red-500" size={14} />
          <span>Словарь</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-950 text-red-400 font-mono text-[10px] border border-red-800/40">
            {wordsCount}
          </span>
        </button>
      </div>
    </header>
  );
}
