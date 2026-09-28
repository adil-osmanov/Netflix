const fs = require('fs');
let content = fs.readFileSync('src/components/CollectionViewerModal.tsx', 'utf8');

const oldCode = `                      <div className="flex flex-col flex-1">
                        <span className="text-white font-bold text-lg">{ep.parsedTitle}</span>
                        <span className="text-sm text-zinc-400">
                          {isSeries ? \`Серия \${idx + 1}\` : \`Часть \${idx + 1}\`}
                        </span>
                      </div>`;

const newCode = `                      <div className="flex flex-col flex-1">
                        <span className="text-white font-bold text-lg">{ep.parsedTitle}</span>
                      </div>`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('src/components/CollectionViewerModal.tsx', content);
