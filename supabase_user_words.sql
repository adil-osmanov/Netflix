-- Создание таблицы для сохранения немецких слов из YouTube в Supabase
CREATE TABLE IF NOT EXISTS public.user_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  context_sentence TEXT,
  source TEXT DEFAULT 'youtube',
  video_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для сортировки по новизне
CREATE INDEX IF NOT EXISTS idx_user_words_created_at ON public.user_words (created_at DESC);

-- Включение RLS и политик доступа
ALTER TABLE public.user_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on user_words" 
ON public.user_words 
FOR ALL 
USING (true) 
WITH CHECK (true);
