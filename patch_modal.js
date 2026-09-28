const fs = require('fs');
let content = fs.readFileSync('src/components/AddContentModal.tsx', 'utf8');

// 1. Add release_year to formData state
content = content.replace(
  '    title: "",\n    is_collection: false,',
  '    title: "",\n    release_year: "",\n    is_collection: false,'
);

// 2. Add release_year to edit effect
content = content.replace(
  '          title: movieToEdit.title,\n          is_collection: !!movieToEdit.is_collection,',
  '          title: movieToEdit.title,\n          release_year: movieToEdit.release_year || "",\n          is_collection: !!movieToEdit.is_collection,'
);

// 3. Add release_year to submission
const subOld = "    submission.append('is_collection', String(formData.is_collection));";
const subNew = "    submission.append('is_collection', String(formData.is_collection));\n    if (formData.release_year) submission.append('release_year', formData.release_year);";
content = content.replace(subOld, subNew);

// 4. Add release_year to reset after success
content = content.replace(
  'setFormData({ title: "", is_collection: false, telegram_link: "", seasons: [{ seasonNumber: 1, episodes: [] }] });',
  'setFormData({ title: "", release_year: "", is_collection: false, telegram_link: "", seasons: [{ seasonNumber: 1, episodes: [] }] });'
);

// 5. Add input field
const titleInput = `          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Название контента</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E50914] transition-all"
              placeholder="Например: Начало"
            />
          </div>`;

const releaseYearInput = `
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Год выпуска (необязательно)</label>
            <input 
              type="text" 
              value={formData.release_year}
              onChange={(e) => setFormData({...formData, release_year: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E50914] transition-all"
              placeholder="Например: 2010 или 2010 - 2013"
            />
          </div>`;

content = content.replace(titleInput, titleInput + releaseYearInput);

fs.writeFileSync('src/components/AddContentModal.tsx', content);
