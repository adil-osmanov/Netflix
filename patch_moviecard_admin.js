const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// 1. Add state for hideAdmin
content = content.replace(
  '  const [mounted, setMounted] = useState(false);',
  '  const [mounted, setMounted] = useState(false);\n  const [hideAdmin, setHideAdmin] = useState(false);'
);

// 2. Add localStorage listener
const effectStr = `  useEffect(() => {
    setMounted(true);
    const checkSettings = () => setHideAdmin(localStorage.getItem('netflix_hide_add_buttons') === 'true');
    checkSettings();
    window.addEventListener('storage', checkSettings);`;
content = content.replace(
  '  useEffect(() => {\n    setMounted(true);',
  effectStr
);
content = content.replace(
  '  }, [editOpen, movie.id, movie.is_collection]);',
  '    return () => window.removeEventListener(\'storage\', checkSettings);\n  }, [editOpen, movie.id, movie.is_collection]);'
);

// 3. Hide buttons on mobile (hidden md:flex) AND if hideAdmin is true
const buttonsStrOld = `          {/* Top Right: Edit & Delete */}
          <div className={\`absolute top-2 right-2 md:top-3 md:right-3 flex gap-2 transition-all duration-300 \${isHovered ? 'opacity-100 translate-y-0' : 'opacity-100 md:opacity-0 md:-translate-y-2'}\`}>`;
const buttonsStrNew = `          {/* Top Right: Edit & Delete */}
          {!hideAdmin && (
            <div className={\`absolute top-2 right-2 md:top-3 md:right-3 hidden md:flex gap-2 transition-all duration-300 \${isHovered ? 'opacity-100 translate-y-0' : 'opacity-100 md:opacity-0 md:-translate-y-2'}\`}>`;

content = content.replace(buttonsStrOld, buttonsStrNew);
content = content.replace(
  '              <Pencil className="w-3.5 h-3.5" />\n            </button>\n            <button \n              onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}\n              className="w-8 h-8 bg-black/60 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-[#E50914] hover:border-[#E50914] transition-all"\n              title="Удалить"\n            >\n              <Trash2 className="w-3.5 h-3.5" />\n            </button>\n          </div>',
  '              <Pencil className="w-3.5 h-3.5" />\n            </button>\n            <button \n              onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}\n              className="w-8 h-8 bg-black/60 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-[#E50914] hover:border-[#E50914] transition-all"\n              title="Удалить"\n            >\n              <Trash2 className="w-3.5 h-3.5" />\n            </button>\n          </div>\n          )}'
);

fs.writeFileSync('src/components/MovieCard.tsx', content);
