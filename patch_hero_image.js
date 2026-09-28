const fs = require('fs');
let content = fs.readFileSync('src/components/Hero.tsx', 'utf8');

const oldHeroStart = `  return (
    <div 
      className="relative w-full min-h-[55vh] md:min-h-[75vh] flex flex-col justify-end pb-8 md:pb-16 z-10 bg-[#141414]"

      style={{
        backgroundImage: \`url(\${displayMovie.cover_url})\`,
        backgroundSize: 'cover',
        backgroundPosition: 'top center'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 md:from-[#141414] md:via-[#141414]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 md:via-[#141414]/20 to-transparent" />

      <div className="relative z-20 px-4 md:px-12 lg:px-16 max-w-3xl">`;

const newHeroStart = `  return (
    <div className="relative w-full min-h-[55vh] sm:min-h-[65vh] md:min-h-[75vh] flex flex-col justify-end pt-[50vw] md:pt-0 pb-8 md:pb-16 z-10 bg-[#141414]">
      {/* Background Image Container */}
      <div 
        className="absolute top-0 left-0 w-full aspect-[4/3] md:aspect-auto md:h-full bg-top md:bg-center bg-no-repeat bg-cover"
        style={{ backgroundImage: \`url(\${displayMovie.cover_url})\` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 md:from-[#141414] md:via-[#141414]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 md:via-[#141414]/20 to-transparent" />
      </div>

      <div className="relative z-20 px-4 md:px-12 lg:px-16 max-w-3xl -mt-10 md:mt-0">`;

content = content.replace(oldHeroStart, newHeroStart);
fs.writeFileSync('src/components/Hero.tsx', content);
