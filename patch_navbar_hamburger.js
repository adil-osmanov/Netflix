const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// 1. Add Menu icon import
content = content.replace(
  'import { Search } from "lucide-react";',
  'import { Search, Menu, X } from "lucide-react";'
);

// 2. Add mobile menu state
content = content.replace(
  '  const [showSearch, setShowSearch] = useState(false);',
  '  const [showSearch, setShowSearch] = useState(false);\n  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);'
);

// 3. Update Left Side (add Hamburger, hide links on mobile)
const leftSideOld = `        {/* LEFT SIDE */}
        <div className="flex items-center">
          <Link href="/?category=all" onClick={() => setSearchTerm('')} className="text-xl md:text-3xl font-bold text-[#E50914] cursor-pointer flex-shrink-0" style={{ fontFamily: 'Arial, sans-serif' }}>
            NETFLIX
          </Link>
          <div className="flex gap-3 md:gap-5 ml-4 md:ml-10 overflow-x-auto no-scrollbar">
            <Link href="/?category=all" onClick={() => setSearchTerm('')} className={getLinkClass('all')}>Главная</Link>
            <Link href="/?category=movies" onClick={() => setSearchTerm('')} className={getLinkClass('movies')}>Фильмы</Link>
            <Link href="/?category=series" onClick={() => setSearchTerm('')} className={getLinkClass('series')}>Сериалы</Link>
            <Link href="/?category=cartoons" onClick={() => setSearchTerm('')} className={getLinkClass('cartoons')}>Мультфильмы</Link>
          </div>
        </div>`;

const leftSideNew = `        {/* LEFT SIDE */}
        <div className="flex items-center">
          <button 
            className="md:hidden mr-4 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Link href="/?category=all" onClick={() => setSearchTerm('')} className="text-2xl md:text-3xl font-bold text-[#E50914] cursor-pointer flex-shrink-0" style={{ fontFamily: 'Arial, sans-serif' }}>
            NETFLIX
          </Link>
          <div className="hidden md:flex gap-5 ml-10">
            <Link href="/?category=all" onClick={() => setSearchTerm('')} className={getLinkClass('all')}>Главная</Link>
            <Link href="/?category=movies" onClick={() => setSearchTerm('')} className={getLinkClass('movies')}>Фильмы</Link>
            <Link href="/?category=series" onClick={() => setSearchTerm('')} className={getLinkClass('series')}>Сериалы</Link>
            <Link href="/?category=cartoons" onClick={() => setSearchTerm('')} className={getLinkClass('cartoons')}>Мультфильмы</Link>
          </div>
        </div>`;

content = content.replace(leftSideOld, leftSideNew);

// 4. Add Mobile Menu dropdown
const mobileMenuStr = `
      {/* MOBILE MENU DROPDOWN */}
      <div className={\`md:hidden absolute top-full left-0 w-full bg-[#141414]/95 backdrop-blur-md transition-all duration-300 overflow-hidden flex flex-col \${mobileMenuOpen ? 'max-h-64 py-4 border-b border-zinc-800' : 'max-h-0 py-0 border-transparent'}\`}>
        <div className="flex flex-col gap-4 px-6">
          <Link href="/?category=all" onClick={() => { setSearchTerm(''); setMobileMenuOpen(false); }} className={getLinkClass('all')}>Главная</Link>
          <Link href="/?category=movies" onClick={() => { setSearchTerm(''); setMobileMenuOpen(false); }} className={getLinkClass('movies')}>Фильмы</Link>
          <Link href="/?category=series" onClick={() => { setSearchTerm(''); setMobileMenuOpen(false); }} className={getLinkClass('series')}>Сериалы</Link>
          <Link href="/?category=cartoons" onClick={() => { setSearchTerm(''); setMobileMenuOpen(false); }} className={getLinkClass('cartoons')}>Мультфильмы</Link>
        </div>
      </div>
    </nav>`;

content = content.replace('    </nav>', mobileMenuStr);

fs.writeFileSync('src/components/Navbar.tsx', content);
