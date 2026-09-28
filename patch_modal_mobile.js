const fs = require('fs');
let content = fs.readFileSync('src/components/CollectionViewerModal.tsx', 'utf8');

content = content.replace(
  '            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full max-w-3xl">',
  '            <div className="absolute bottom-0 left-0 p-4 md:p-12 w-full max-w-3xl">'
);

content = content.replace(
  '          <div className="w-full px-8 md:px-12 pb-12 flex flex-col relative z-10 bg-[#181818]">',
  '          <div className="w-full px-4 md:px-12 pb-8 md:pb-12 flex flex-col relative z-10 bg-[#181818]">'
);

content = content.replace(
  '              <div className="flex items-center justify-between mb-8">',
  '              <div className="flex items-center justify-between mb-4 md:mb-8 mt-2">'
);

fs.writeFileSync('src/components/CollectionViewerModal.tsx', content);
