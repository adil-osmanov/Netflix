"use client";

import Link from "next/link";
import { Search, Menu, X } from "lucide-react";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSearch } from "./SearchContext";

function NavbarContent() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const linkBaseClass = "text-base md:text-[14px] whitespace-nowrap transition-colors cursor-pointer";
  const getLinkClass = (category: string) => 
    currentCategory === category && !searchTerm
      ? `${linkBaseClass} text-white font-bold` 
      : `${linkBaseClass} text-[#e5e5e5] hover:text-[#b3b3b3] font-normal`;

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-colors duration-500 ${isScrolled || showSearch ? 'bg-[#141414]' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
      <div className="w-full flex items-center justify-between px-4 md:px-14 py-4 md:py-5">
        {/* LEFT SIDE */}
        <div className="flex items-center">
          <button 
            className="md:hidden mr-4 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Link href="/?category=all" onClick={() => setSearchTerm('')} className="cursor-pointer flex-shrink-0" aria-label="Netflix">
            <svg viewBox="0 0 1024 276.742" className="w-[85px] md:w-[111px]" fill="#E50914" xmlns="http://www.w3.org/2000/svg">
              <path d="M140.803 258.904c-15.404 2.705-31.079 3.516-47.294 5.676l-49.458-144.856v151.073c-15.404 1.621-29.457 3.783-44.051 5.945v-276.742h41.08l56.212 157.021v-157.021h43.511v258.904zm85.131-157.558c16.757 0 42.431-.811 57.835-.811v43.24c-19.189 0-41.619 0-57.835.811v64.322c25.405-1.621 50.809-3.785 76.482-4.596v41.617l-119.724 9.461v-255.39h119.724v43.241h-76.482v58.105zm237.284-58.104h-44.862v198.908c-14.594 0-29.188 0-43.239.539v-199.447h-44.862v-43.242h132.965l-.002 43.242zm70.266 55.132h59.187v43.24h-59.187v98.104h-42.433v-239.718h120.808v43.241h-78.375v55.133zm148.641 103.507c24.594.539 49.456 2.434 73.51 3.783v42.701c-38.646-2.434-77.293-4.863-116.75-5.676v-242.689h43.24v201.881zm109.994 49.457c13.783.812 28.377 1.623 42.43 3.242v-254.58h-42.43v251.338zm231.881-251.338l-54.863 131.615 54.863 145.127c-16.217-2.162-32.432-5.135-48.648-7.838l-31.078-79.994-31.617 73.51c-15.678-2.705-30.812-3.516-46.484-5.678l55.672-126.75-50.269-129.992h46.482l28.377 72.699 30.27-72.699h47.295z"/>
            </svg>
          </Link>
          <div className="hidden md:flex gap-5 ml-10">
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
