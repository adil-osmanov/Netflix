const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  let [key, ...val] = line.split('=');
  if (key) {
    let value = val.join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key.trim()] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  // Fetch all content WITHOUT explicit order to get the physical order (oldest first)
  const { data, error } = await supabase.from('content').select('id');
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Found ${data.length} items`);
  
  // Update them to have sequential timestamps
  // Let's set them starting from 2020-01-01 and adding 1 day for each item, 
  // so the first item (Jackie Chan) gets the oldest date, and the last item gets the newest.
  
  let baseDate = new Date('2020-01-01T00:00:00Z');
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const newDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    
    await supabase.from('content').update({ created_at: newDate.toISOString() }).eq('id', item.id);
    console.log(`Updated ${i+1}/${data.length}: ${item.id} to ${newDate.toISOString()}`);
  }
  
  console.log("Done!");
}

fix();
