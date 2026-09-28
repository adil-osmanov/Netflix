const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

// 1. Add getPlayLink
const getLinkFunc = `
  const getPlayLink = () => {
    if (movie.is_collection) return undefined;
    let url = movie.telegram_url;
    if (url && !url.includes('http')) {
      const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
      url = \`https://t.me/c/\${channelId}/\${url}\`;
    }
    return url || undefined;
  };`;

content = content.replace(
  '  const handlePlay = (e?: React.MouseEvent) => {',
  getLinkFunc + '\n  const handlePlay = (e?: React.MouseEvent) => {'
);

// 2. Wrap the card in conditional element
const oldDiv = `      <div 
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('movieId', movie.id);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={\`group relative w-full aspect-video flex-shrink-0 cursor-pointer transition-z duration-0 \${isHovered ? 'z-[70]' : isAnimatingOut ? 'z-[60]' : 'z-10'}\`}
        onClick={handlePlay}
      >`;

const newDiv = `      {movie.is_collection ? (
        <div 
          draggable={true}
          onDragStart={(e) => {
            e.dataTransfer.setData('movieId', movie.id);
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={\`group relative w-full aspect-video flex-shrink-0 cursor-pointer transition-z duration-0 \${isHovered ? 'z-[70]' : isAnimatingOut ? 'z-[60]' : 'z-10'}\`}
          onClick={handlePlay}
        >
          <CardInner />
        </div>
      ) : (
        <a 
          draggable={true}
          onDragStart={(e) => {
            e.dataTransfer.setData('movieId', movie.id);
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={\`group relative w-full block aspect-video flex-shrink-0 cursor-pointer transition-z duration-0 \${isHovered ? 'z-[70]' : isAnimatingOut ? 'z-[60]' : 'z-10'}\`}
          onClick={(e) => {
            const urlParams = new URLSearchParams(window.location.search);
            const categoryType = urlParams.get('category') || 'all';
            setLastWatchedAction(categoryType, movie);
          }}
          href={getPlayLink()}
          target="_blank"
          rel="noopener noreferrer"
        >
          <CardInner />
        </a>
      )}`;

// We need to extract the inner content into a component or variable.
// Since it uses hooks, extracting into a variable is easiest.
const oldInner = `        <div className={\`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] \${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}\`}>`;

const newInner = `
  const CardInner = () => (
    <>
        <div className={\`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] \${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}\`}>`;

content = content.replace(oldInner, newInner);

const oldEnd = `        </div>
      </div>

      <CollectionViewerModal 
        movie={movie}`;

const newEnd = `        </div>
    </>
  );

  return (
    <>
${newDiv}

      <CollectionViewerModal 
        movie={movie}`;

content = content.replace(oldEnd, newEnd);

// Remove the old <div draggable ...> wrapper that we replaced in newEnd logic.
const outerDivStart = `  return (
    <>
      <div 
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('movieId', movie.id);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={\`group relative w-full aspect-video flex-shrink-0 cursor-pointer transition-z duration-0 \${isHovered ? 'z-[70]' : isAnimatingOut ? 'z-[60]' : 'z-10'}\`}
        onClick={handlePlay}
      >`;

content = content.replace(outerDivStart, "");

fs.writeFileSync('src/components/MovieCard.tsx', content);
