const fs = require('fs');
let content = fs.readFileSync('src/components/MovieRow.tsx', 'utf8');

// 1. Title size
content = content.replace(
  '            <p className="text-[#e5e5e5] text-[1.2vw] md:text-xl font-bold tracking-wide group-hover/title:text-white transition-colors">',
  '            <p className="text-[#e5e5e5] text-base md:text-xl lg:text-[1.2vw] font-bold tracking-wide group-hover/title:text-white transition-colors">'
);

// 2. Padding/Margin of Carousel on Mobile (reduce vertical gap)
content = content.replace(
  '              className="flex overflow-x-auto overflow-y-hidden gap-2 py-12 -my-12 scroll-smooth snap-x relative -mx-4 px-4 md:-mx-12 md:px-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"',
  '              className="flex overflow-x-auto overflow-y-hidden gap-2 py-4 -my-4 md:py-12 md:-my-12 scroll-smooth snap-x relative -mx-4 px-4 md:-mx-12 md:px-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"'
);

// 3. Arrow positioning
content = content.replace(
  '              className={`absolute top-12 bottom-12 left-0 z-[70] w-12 md:w-16 lg:w-[4vw] bg-black/50 flex items-center justify-center cursor-pointer transition-all duration-300 -ml-4 md:-ml-12 ${showLeftArrow ? (isHovered ? \'opacity-100 bg-black/70 hover:w-[5vw]\' : \'opacity-0\') : \'opacity-0 pointer-events-none\'}`}',
  '              className={`absolute top-4 bottom-4 md:top-12 md:bottom-12 left-0 z-[70] w-12 md:w-16 lg:w-[4vw] bg-black/50 flex items-center justify-center cursor-pointer transition-all duration-300 -ml-4 md:-ml-12 ${showLeftArrow ? (isHovered ? \'opacity-100 bg-black/70 hover:w-[5vw]\' : \'opacity-0\') : \'opacity-0 pointer-events-none\'} hidden md:flex`}'
);

content = content.replace(
  '              className={`absolute top-12 bottom-12 right-0 z-[70] w-12 md:w-16 lg:w-[4vw] bg-black/50 flex items-center justify-center cursor-pointer transition-all duration-300 -mr-4 md:-mr-12 ${showRightArrow ? (isHovered ? \'opacity-100 bg-black/70 hover:w-[5vw]\' : \'opacity-0\') : \'opacity-0 pointer-events-none\'}`}',
  '              className={`absolute top-4 bottom-4 md:top-12 md:bottom-12 right-0 z-[70] w-12 md:w-16 lg:w-[4vw] bg-black/50 flex items-center justify-center cursor-pointer transition-all duration-300 -mr-4 md:-mr-12 ${showRightArrow ? (isHovered ? \'opacity-100 bg-black/70 hover:w-[5vw]\' : \'opacity-0\') : \'opacity-0 pointer-events-none\'} hidden md:flex`}'
);

fs.writeFileSync('src/components/MovieRow.tsx', content);
