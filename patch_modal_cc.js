const fs = require('fs');
let content = fs.readFileSync('src/components/AddContentModal.tsx', 'utf8');

// 1. Add has_subtitles to initial state
content = content.replace(
  '    telegram_link: "",',
  '    telegram_link: "",\n    has_subtitles: false,'
);

// 2. Add has_subtitles to movieToEdit state
content = content.replace(
  '          is_collection: !!movieToEdit.is_collection,\n          telegram_link: movieToEdit.telegram_url || "",',
  '          is_collection: !!movieToEdit.is_collection,\n          telegram_link: movieToEdit.telegram_url || "",\n          has_subtitles: !!movieToEdit.has_subtitles,'
);

// 3. Add to the ELSE block reset
content = content.replace(
  'setFormData({ title: "", release_year: "", is_collection: false, telegram_link: "", seasons: [{ seasonNumber: 1, episodes: [{ title: "", telegram_link: "" }] }] });',
  'setFormData({ title: "", release_year: "", is_collection: false, has_subtitles: false, telegram_link: "", seasons: [{ seasonNumber: 1, episodes: [{ title: "", telegram_link: "" }] }] });'
);

// 4. Add to the SUCCESS block reset
content = content.replace(
  'setFormData({ title: "", release_year: "", is_collection: false, telegram_link: "", seasons: [{ seasonNumber: 1, episodes: [] }] });',
  'setFormData({ title: "", release_year: "", is_collection: false, has_subtitles: false, telegram_link: "", seasons: [{ seasonNumber: 1, episodes: [] }] });'
);

// 5. Add to submission formData
content = content.replace(
  'submission.append(\'poster_url\', previewUrl);',
  'submission.append(\'poster_url\', previewUrl);\n    submission.append(\'has_subtitles\', String(formData.has_subtitles));'
);

// 6. Add checkbox UI below the is_collection checkbox
const isCollectionBlock = `          <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-md">
            <input 
              type="checkbox" 
              id="is_collection"
              checked={formData.is_collection}
              onChange={(e) => setFormData({...formData, is_collection: e.target.checked})}
              className="w-5 h-5 accent-[#E50914] rounded bg-zinc-800 border-zinc-700"
            />
            <label htmlFor="is_collection" className="text-white font-medium cursor-pointer select-none flex-1">
              {isSeries ? "Это сериал (несколько сезонов/серий)" : "Это коллекция (несколько частей франшизы)"}
            </label>
          </div>`;

const newSubtitlesBlock = `\n          <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-md">
            <input 
              type="checkbox" 
              id="has_subtitles"
              checked={formData.has_subtitles}
              onChange={(e) => setFormData({...formData, has_subtitles: e.target.checked})}
              className="w-5 h-5 accent-[#E50914] rounded bg-zinc-800 border-zinc-700"
            />
            <label htmlFor="has_subtitles" className="text-white font-medium cursor-pointer select-none flex-1">
              Есть субтитры [CC]
            </label>
          </div>`;

content = content.replace(isCollectionBlock, isCollectionBlock + newSubtitlesBlock);

fs.writeFileSync('src/components/AddContentModal.tsx', content);
