const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

const oldHeroStart = `  return (
    <div className="relative w-full flex flex-col pt-[50vw] sm:pt-[55vw] md:pt-0 md:justify-end md:min-h-[75vh] pb-4 md:pb-16 z-10 bg-[#141414]">
      {/* Background Image Container */}
      <div 
        className="absolute top-0 left-0 w-full aspect-[16/9] sm:aspect-[4/3] md:aspect-auto md:h-full bg-top md:bg-center bg-no-repeat bg-cover"
        style={{ backgroundImage: \`url(\${displayMovie.cover_url})\` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 md:from-[#141414] md:via-[#141414]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 md:via-[#141414]/20 to-transparent" />
      </div>

      <div className="relative z-20 px-4 md:px-12 lg:px-16 max-w-3xl">`;

const newHeroStart = `  return (
    <div 
      className="relative w-full aspect-[16/9] sm:aspect-video md:aspect-auto md:min-h-[75vh] flex flex-col justify-end pb-4 md:pb-16 z-10 bg-[#141414] bg-top md:bg-center bg-no-repeat bg-contain md:bg-cover"
      style={{ backgroundImage: \`url(\${displayMovie.cover_url})\` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 md:from-[#141414] md:via-[#141414]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 md:via-[#141414]/20 to-transparent" />

      <div className="relative z-20 px-4 md:px-12 lg:px-16 max-w-3xl">`;

content = content.replace(oldHeroStart, newHeroStart);

// Hide description on mobile
content = content.replace(
  '        {displayMovie.description && (',
  '        {displayMovie.description && ('
);
content = content.replace(
  '          <p className="text-sm md:text-lg text-zinc-200 mb-6 md:mb-10 line-clamp-3 md:line-clamp-4 max-w-2xl leading-snug drop-shadow-lg">',
  '          <p className="hidden md:block text-sm md:text-lg text-zinc-200 mb-6 md:mb-10 line-clamp-3 md:line-clamp-4 max-w-2xl leading-snug drop-shadow-lg">'
);

// Reduce empty div margin on mobile
content = content.replace(
  '        {!displayMovie.description && <div className="mb-6 md:mb-10" />}',
  '        {!displayMovie.description && <div className="mb-2 md:mb-10" />}'
);

// Reduce title text size on mobile to fit in the smaller box
content = content.replace(
  '        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-3 md:mb-6 drop-shadow-2xl">',
  '        <h1 className="text-2xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-1 md:mb-6 drop-shadow-2xl">'
);

// Reduce metadata spacing
content = content.replace(
  '          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-base font-semibold mb-4 md:mb-6 drop-shadow-md">',
  '          <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-base font-semibold mb-3 md:mb-6 drop-shadow-md">'
);

// Adjust button for mobile
content = content.replace(
  '            className="bg-white text-black font-bold text-sm md:text-lg px-4 md:px-8 py-2 md:py-3 rounded-md flex items-center gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"',
  '            className="bg-white text-black font-bold text-xs md:text-lg px-3 md:px-8 py-1.5 md:py-3 rounded-md flex items-center gap-1.5 md:gap-2 hover:bg-white/80 transition-colors cursor-pointer shadow-lg drop-shadow-md"'
);
content = content.replace(
  '            <Play className="w-5 h-5 md:w-7 md:h-7" fill="currentColor" />',
  '            <Play className="w-4 h-4 md:w-7 md:h-7" fill="currentColor" />'
);

// Collection badge size
content = content.replace(
  '            <span className="text-[#E50914] font-black text-sm tracking-widest uppercase">N</span>\n            <span className="text-zinc-300 text-sm tracking-[0.2em] font-medium uppercase">Коллекция</span>',
  '            <span className="text-[#E50914] font-black text-xs md:text-sm tracking-widest uppercase">N</span>\n            <span className="text-zinc-300 text-xs md:text-sm tracking-[0.2em] font-medium uppercase">Коллекция</span>'
);
content = content.replace(
  '          <div className="flex items-center gap-2 mb-4 drop-shadow-lg">',
  '          <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-4 drop-shadow-lg">'
);


fs.writeFileSync('src/components/Hero.tsx', content);
