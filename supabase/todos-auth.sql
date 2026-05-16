alter table public.todos
add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists todos_user_id_idx on public.todos(user_id);

alter table public.todos enable row level security;

drop policy if exists "Allow public read todos" on public.todos;
drop policy if exists "Allow public insert todos" on public.todos;
drop policy if exists "Allow public update todos" on public.todos;
drop policy if exists "Allow public delete todos" on public.todos;

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
