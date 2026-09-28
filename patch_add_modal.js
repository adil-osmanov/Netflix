const fs = require('fs');
let content = fs.readFileSync('src/components/AddContentModal.tsx', 'utf8');

content = content.replace(
  '      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-[#141414] rounded-xl shadow-2xl relative p-8 max-h-[85vh] overflow-y-auto no-scrollbar border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">',
  '      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-[#141414] rounded-xl shadow-2xl relative p-4 md:p-8 max-h-[90vh] md:max-h-[85vh] overflow-y-auto no-scrollbar border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">'
);

fs.writeFileSync('src/components/AddContentModal.tsx', content);
