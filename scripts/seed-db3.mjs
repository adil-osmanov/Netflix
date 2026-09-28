import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const movies = [
  {
    title: "Stranger Things",
    description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
    category: "Trending Now",
    cover_url: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    telegram_message_id: 2
  },
  {
    title: "Breaking Bad",
    description: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.",
    category: "Trending Now",
    cover_url: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    telegram_message_id: 3
  },
  {
    title: "The Witcher",
    description: "Geralt of Rivia, a mutated monster-hunter for hire, journeys toward his destiny in a turbulent world.",
    category: "Trending Now",
    cover_url: "https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg",
    telegram_message_id: 4
  },
  {
    title: "Money Heist",
    description: "An unusual group of robbers attempt to carry out the most perfect robbery in Spanish history.",
    category: "Action",
    cover_url: "https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg",
    telegram_message_id: 5
  },
  {
    title: "Dark",
    description: "A family saga with a supernatural twist, set in a German town where the disappearance of two young children exposes the relationships among four families.",
    category: "Thriller",
    cover_url: "https://image.tmdb.org/t/p/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg",
    telegram_message_id: 6
  }
];

async function seedDb() {
  const { data, error } = await supabase.from('movies').insert(movies).select();
  if (error) {
    console.error("DB Error:", error.message);
  } else {
    console.log("Inserted movies:", data.length);
  }
}
seedDb();
