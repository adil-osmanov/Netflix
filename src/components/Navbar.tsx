"use client";

import Link from "next/link";
import { Search, Menu, X } from "lucide-react";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useSearch } from "./SearchContext";
import { NetflixLogo } from "@/components/common/NetflixLogo";

function NavbarContent() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentCategory = searchParams.get('category') || 'all';
  const isYouTube = pathname?.startsWith('/youtube');
  
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

  const linkBaseClass = "text-base md:text-[14px] whitespace-nowrap transition-colors cursor-pointer";
  const getLinkClass = (category: string) => 
    !isYouTube && currentCategory === category && !searchTerm
      ? `${linkBaseClass} text-white font-bold` 
      : `${linkBaseClass} text-[#e5e5e5] hover:text-[#b3b3b3] font-normal`;

  const getYouTubeLinkClass = () =>
    isYouTube && !searchTerm
      ? `${linkBaseClass} text-white font-bold flex items-center gap-1.5`
      : `${linkBaseClass} text-[#e5e5e5] hover:text-[#b3b3b3] font-normal flex items-center gap-1.5`;

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-colors duration-500 ${isScrolled || showSearch ? 'bg-[#141414]' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
      <div className="w-full flex items-center justify-between px-4 pl-20 md:px-14 md:pl-20 py-4 md:py-5">
        {/* LEFT SIDE */}
        <div className="flex items-center">
          <button 
            className="md:hidden mr-4 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <NetflixLogo className="h-6 md:h-7" onClick={() => setSearchTerm('')} />
          <div className="hidden md:flex gap-5 ml-10">
            <Link href="/?category=all" onClick={() => setSearchTerm('')} className={getLinkClass('all')}>Главная</Link>
            <Link href="/?category=movies" onClick={() => setSearchTerm('')} className={getLinkClass('movies')}>Фильмы</Link>
            <Link href="/?category=series" onClick={() => setSearchTerm('')} className={getLinkClass('series')}>Сериалы</Link>
            <Link href="/?category=cartoons" onClick={() => setSearchTerm('')} className={getLinkClass('cartoons')}>Мультфильмы</Link>
            <Link 
              href="/youtube" 
              onClick={() => setSearchTerm('')} 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-zinc-300 hover:text-white transition-all group outline-none select-none"
              title="YouTube"
            >
              <svg className="w-4 h-3 fill-[#FF0000] group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">YouTube</span>
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center pr-4">
          <div 
            className={`flex items-center transition-all duration-500 ease-in-out ${
              showSearch ? 'w-32 sm:w-48 md:w-64 border-b border-white pb-1' : 'w-5 md:w-6 border-b border-transparent pb-1'
            }`}
          >
            <Search 
              className="w-4 h-4 md:w-6 md:h-6 text-white cursor-pointer flex-shrink-0 font-bold" 
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
              className={`bg-transparent outline-none text-white text-[12px] md:text-[14px] ml-1 md:ml-2 placeholder:text-gray-500 transition-opacity duration-500 ${
                showSearch ? 'opacity-100 w-full' : 'opacity-0 w-0'
              }`}
              onBlur={() => {
                if (!searchTerm) setShowSearch(false);
              }}
            />
          </div>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      <div className={`md:hidden absolute top-full left-0 w-full bg-[#141414]/95 backdrop-blur-md transition-all duration-300 overflow-hidden flex flex-col ${mobileMenuOpen ? 'max-h-64 py-4 border-b border-zinc-800' : 'max-h-0 py-0 border-transparent'}`}>
        <div className="flex flex-col gap-4 px-6">
          <Link href="/?category=all" onClick={() => { setSearchTerm(''); setMobileMenuOpen(false); }} className={getLinkClass('all')}>Главная</Link>
          <Link href="/?category=movies" onClick={() => { setSearchTerm(''); setMobileMenuOpen(false); }} className={getLinkClass('movies')}>Фильмы</Link>
          <Link href="/?category=series" onClick={() => { setSearchTerm(''); setMobileMenuOpen(false); }} className={getLinkClass('series')}>Сериалы</Link>
          <Link href="/?category=cartoons" onClick={() => { setSearchTerm(''); setMobileMenuOpen(false); }} className={getLinkClass('cartoons')}>Мультфильмы</Link>
          <Link 
            href="/youtube" 
            onClick={() => { setSearchTerm(''); setMobileMenuOpen(false); }} 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-zinc-300 hover:text-white transition-all group outline-none select-none"
            title="YouTube"
          >
            <svg className="w-4 h-3 fill-[#FF0000] group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">YouTube</span>
          </Link>
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
