const fs = require('fs');
let content = fs.readFileSync('src/components/MovieCard.tsx', 'utf8');

const oldClasses = "rounded-md overflow-hidden bg-[#141414] isolate transform-gpu will-change-transform [-webkit-mask-image:-webkit-radial-gradient(white,black)]";
const newClasses = "rounded-md [clip-path:inset(0_round_6px)] bg-[#141414] isolate transform-gpu will-change-transform";

content = content.replace(oldClasses, newClasses);

fs.writeFileSync('src/components/MovieCard.tsx', content);
