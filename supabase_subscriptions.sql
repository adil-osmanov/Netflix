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

-- Очистка существующих записей от заглушек 'Канал' и 'undefined'
update public.subscriptions
set channel_title = case 
  when channel_id = 'UCbxb2fqe9oNgglAoYqsYOtQ' then 'Easy German'
  when channel_id = 'UCZHpIFMfoJJ_1QxNGLJTzyA' then 'MrWissen2go'
  when channel_id = 'UC4-a6QWRyBlzTFGdS-T_wfw' then 'SWR Handwerkskunst'
  when channel_id = 'UCUuab1dctZzN5ZmRmQnTzkg' then 'WDR Doku'
  when channel_id = 'UCKyTokYo0nK2OA-az-sDijA' then 'VOA Learning English'
  when channel_id = 'UCsooa4yRKGN_zEE8iknghZA' then 'TED-Ed'
  when channel_id = 'UCLXo7UDZvByw2ixzpQCufnA' then 'Vox'
  when channel_id = 'UCHnyfMqiRRG1u-2MsSQLbXA' then 'Veritasium'
  else ''
end
where channel_title = 'Канал' or channel_title = 'undefined' or channel_title is null;

-- Триггер: предотвращение сохранения плейсхолдера 'Канал' в subscriptions
create or replace function clean_channel_title_trigger()
returns trigger as $$
begin
  if new.channel_title is null or new.channel_title = 'Канал' or new.channel_title = 'undefined' then
    new.channel_title := '';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_clean_channel_title on public.subscriptions;
create trigger trg_clean_channel_title
before insert or update on public.subscriptions
for each row
execute function clean_channel_title_trigger();
