'use client';

interface LanguageSwitcherProps {
  currentLang: 'DE' | 'EN';
  onLanguageChange: (lang: 'DE' | 'EN') => void;
}

export function LanguageSwitcher({ currentLang, onLanguageChange }: LanguageSwitcherProps) {
  return (
    <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-full p-1 backdrop-blur-md shadow-lg select-none">
      <button
        type="button"
        onClick={() => onLanguageChange('DE')}
        className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider transition-all duration-200 cursor-pointer outline-none ${
          currentLang === 'DE'
            ? 'bg-[#E50914] text-white shadow-sm'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        DE
      </button>
      <button
        type="button"
        onClick={() => onLanguageChange('EN')}
        className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider transition-all duration-200 cursor-pointer outline-none ${
          currentLang === 'EN'
            ? 'bg-[#E50914] text-white shadow-sm'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  );
}
