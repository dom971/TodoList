-- Harden todos security after Supabase Auth is enabled.
-- Run this from Supabase SQL Editor after confirming authenticated users can use the app.

delete from public.todos
where user_id is null;

alter table public.todos
alter column user_id set not null;

alter table public.todos enable row level security;

drop policy if exists "Allow public read todos" on public.todos;
drop policy if exists "Allow public insert todos" on public.todos;
drop policy if exists "Allow public update todos" on public.todos;
drop policy if exists "Allow public delete todos" on public.todos;

drop policy if exists "Users can read their own todos" on public.todos;
drop policy if exists "Users can insert their own todos" on public.todos;
drop policy if exists "Users can update their own todos" on public.todos;
drop policy if exists "Users can delete their own todos" on public.todos;

create policy "Users can read their own todos"
on public.todos
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own todos"
on public.todos
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own todos"
on public.todos
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own todos"
on public.todos
for delete
to authenticated
using (auth.uid() = user_id);
