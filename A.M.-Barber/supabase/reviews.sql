-- Ejecutar DESPUÉS de schema.sql (Supabase > SQL Editor)
create table public.reviews(id bigint generated always as identity primary key,user_id uuid not null references auth.users on delete cascade,name text not null,avatar_url text,rating int not null check(rating between 1 and 5),comment text not null check(char_length(comment) between 3 and 600),created_at timestamptz default now());
create unique index una_resena_por_usuario on public.reviews(user_id);
alter table public.reviews enable row level security;
create policy "reseñas públicas" on public.reviews for select using(true);
create policy "crear reseña propia" on public.reviews for insert to authenticated with check(auth.uid()=user_id);
create policy "borrar reseña propia o admin" on public.reviews for delete to authenticated using(auth.uid()=user_id or exists(select 1 from public.profiles where id=auth.uid() and is_admin));
-- el nombre y la foto se toman del perfil en el servidor (no se pueden falsificar desde el navegador)
create function public.rellenar_resena() returns trigger language plpgsql security definer set search_path=public as $$ begin select coalesce(name,'Cliente'),avatar_url into new.name,new.avatar_url from public.profiles where id=new.user_id; if new.name is null then new.name:='Cliente'; end if; return new; end $$;
create trigger rellenar_resena before insert on public.reviews for each row execute function public.rellenar_resena();
