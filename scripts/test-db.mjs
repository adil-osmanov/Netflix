import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data, error } = await supabase.from('movies').select('*').limit(1);
  if (error) {
    console.error("DB Error:", error.message);
  } else {
    console.log("DB Success:", data);
  }
}
checkDb();
