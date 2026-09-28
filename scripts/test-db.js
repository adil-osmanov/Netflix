import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data, error } = await supabase.from('movies').select('*');
  if (error) {
    console.error("DB Error:", error.message);
  } else {
    console.log("DB Success, movies count:", data.length);
    console.log(data);
  }
}
checkDb();
