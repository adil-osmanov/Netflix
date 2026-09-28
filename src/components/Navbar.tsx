"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSearch } from "./SearchContext";

function NavbarContent() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || 'all';
  
  const { searchTerm, setSearchTerm } = useSearch();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const linkBaseClass = "text-[12px] md:text-[14px] transition-colors cursor-pointer";
  const getLinkClass = (category: string) => 
    currentCategory === category && !searchTerm
      ? `${linkBaseClass} text-white font-bold` 
      : `${linkBaseClass} text-[#e5e5e5] hover:text-[#b3b3b3] font-normal`;

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-colors duration-500 ${isScrolled || showSearch ? 'bg-[#141414]' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
      <div className="w-full flex items-center justify-between px-4 md:px-14 py-4 md:py-5">
        {/* LEFT SIDE */}
        <div className="flex items-center">
          <Link href="/?category=all" onClick={() => setSearchTerm('')} className="text-2xl md:text-3xl font-bold text-[#E50914] cursor-pointer" style={{ fontFamily: 'Arial, sans-serif' }}>
            NETFLIX
          </Link>
          <div className="flex gap-4 md:gap-5 ml-8 md:ml-10">
            <Link href="/?category=all" onClick={() => setSearchTerm('')} className={getLinkClass('all')}>Главная</Link>
            <Link href="/?category=movies" onClick={() => setSearchTerm('')} className={getLinkClass('movies')}>Фильмы</Link>
            <Link href="/?category=series" onClick={() => setSearchTerm('')} className={getLinkClass('series')}>Сериалы</Link>
            <Link href="/?category=cartoons" onClick={() => setSearchTerm('')} className={getLinkClass('cartoons')}>Мультфильмы</Link>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center pr-4">
          <div 
            className={`flex items-center transition-all duration-500 ease-in-out ${
              showSearch ? 'w-48 md:w-64 border-b border-white pb-1' : 'w-6 border-b border-transparent pb-1'
            }`}
          >
            <Search 
              className="w-5 h-5 md:w-6 md:h-6 text-white cursor-pointer flex-shrink-0 font-bold" 
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch && !searchTerm) {
                  // Closing search
                }
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Фильмы, сериалы, жанры..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`bg-transparent outline-none text-white text-[14px] ml-2 placeholder:text-gray-500 transition-opacity duration-500 ${
                showSearch ? 'opacity-100 w-full' : 'opacity-0 w-0'
              }`}
              onBlur={() => {
                if (!searchTerm) setShowSearch(false);
              }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<nav className="fixed top-0 left-0 w-full z-50 h-20 bg-black/80" />}>
      <NavbarContent />
    </Suspense>
  );
}
