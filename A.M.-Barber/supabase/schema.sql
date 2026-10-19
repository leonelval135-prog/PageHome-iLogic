-- Ejecutar en Supabase > SQL Editor
create table public.profiles(id uuid primary key references auth.users on delete cascade,name text,avatar_url text,is_admin boolean default false);
create table public.shop_status(id int primary key default 1 check(id=1),is_open boolean default true,note text,updated_at timestamptz default now());
insert into public.shop_status(id) values(1);
alter table public.profiles enable row level security;alter table public.shop_status enable row level security;
create policy "ver perfil propio" on public.profiles for select using(auth.uid()=id);
create policy "editar perfil propio" on public.profiles for update using(auth.uid()=id) with check(auth.uid()=id and is_admin=(select is_admin from public.profiles where id=auth.uid()));
create policy "estado público" on public.shop_status for select using(true);
create policy "solo admin cambia estado" on public.shop_status for update using(exists(select 1 from public.profiles where id=auth.uid() and is_admin));
create function public.nuevo_usuario() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,name) values(new.id,new.raw_user_meta_data->>'name'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.nuevo_usuario();
insert into storage.buckets(id,name,public) values('avatars','avatars',true);
create policy "subir foto propia" on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "actualizar foto propia" on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "fotos públicas" on storage.objects for select using(bucket_id='avatars');
-- Para ser admin (tú): update public.profiles set is_admin=true where id='TU-USER-ID';
