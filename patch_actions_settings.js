const fs = require('fs');
let content = fs.readFileSync('src/app/actions.ts', 'utf8');

const newActions = `
export async function getLastWatchedAction(category: string) {
  const { data, error } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'lastWatched_' + category)
    .single();
  if (error || !data) return null;
  return data.value;
}

export async function setLastWatchedAction(category: string, value: any) {
  const { error } = await supabase
    .from('global_settings')
    .upsert({ key: 'lastWatched_' + category, value: value });
  return !error;
}
`;

content += newActions;
fs.writeFileSync('src/app/actions.ts', content);
