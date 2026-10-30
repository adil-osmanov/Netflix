-- Таблица подписок на каналы
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  channel_id text not null,
  channel_title text not null,
  channel_thumbnail text default '',
  language text not null check (language in ('DE', 'EN')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Предотвращаем дублирование одного канала в рамках одного языка
  constraint unique_channel_per_lang unique (channel_id, language)
);

-- Индекс для быстрой выборки по языку
create index if not exists idx_subscriptions_lang on public.subscriptions (language);

-- Включаем Row Level Security (RLS)
alter table public.subscriptions enable row level security;

-- Политика полного доступа для веб-клиента (anon key)
create policy "Allow public read and write access" 
on public.subscriptions 
for all 
using (true) 
with check (true);
