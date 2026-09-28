import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const movies = [
  {
    title: "Stranger Things",
    description: "When a young boy vanishes...",
    category: "Sci-Fi",
    cover_url: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
  }
];

async function seedDb() {
  const { data, error } = await supabase.from('movies').insert(movies).select();
  if (error) {
    console.error("DB Error:", error.message);
  } else {
    console.log("Inserted:", data);
  }
}
seedDb();
