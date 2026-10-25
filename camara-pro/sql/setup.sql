-- Ejecuta una vez en Supabase > SQL Editor
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict (id) do nothing;

create policy "media_select_own" on storage.objects for select to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
