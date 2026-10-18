-- Ejecutar DESPUÉS de schema.sql (Supabase > SQL Editor). Sistema de citas con bloqueo de horarios y expiración a 20 min.
create table public.appointments(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null, service text not null, barber text not null default 'Ángel Murillo',
  fecha date not null, hora time not null, comments text,
  status text not null default 'pendiente' check(status in ('pendiente','aceptada','rechazada')),
  created_at timestamptz not null default now());
-- un horario solo puede estar tomado una vez (pendiente o aceptada)
create unique index cita_unica on public.appointments(barber,fecha,hora) where status in ('pendiente','aceptada');
alter table public.appointments enable row level security;
create policy "ver mis citas o admin" on public.appointments for select to authenticated using(auth.uid()=user_id or exists(select 1 from public.profiles where id=auth.uid() and is_admin));
create policy "cancelar mi cita pendiente" on public.appointments for delete to authenticated using(auth.uid()=user_id and status='pendiente');

create function public.limpiar_citas() returns void language sql security definer set search_path=public as $$
  delete from public.appointments where status='pendiente' and created_at<now()-interval '20 minutes'; $$;

create function public.horarios_ocupados(p_date date,p_barber text) returns table(t time) language sql security definer set search_path=public as $$
  select hora from public.appointments where fecha=p_date and barber=p_barber and (status='aceptada' or (status='pendiente' and created_at>now()-interval '20 minutes')); $$;

create function public.reservar_cita(p_service text,p_barber text,p_date date,p_time time,p_comments text) returns bigint language plpgsql security definer set search_path=public as $$
declare v_name text; v_id bigint; v_now timestamp:=now() at time zone 'America/Mexico_City'; v_close time;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  if p_barber<>'Ángel Murillo' then raise exception 'fuera_horario'; end if;
  v_close:=case when extract(dow from p_date)=0 then time '16:00' else time '20:00' end;
  if p_time<time '11:00' or p_time>=v_close or extract(minute from p_time) not in (0,30) then raise exception 'fuera_horario'; end if;
  if p_date>v_now::date+1 then raise exception 'fuera_ventana'; end if; -- solo hoy y mañana
  if (p_date+p_time)<=v_now then raise exception 'pasada'; end if;
  perform public.limpiar_citas();
  if (select count(*) from public.appointments where user_id=auth.uid() and status in ('pendiente','aceptada') and fecha>=v_now::date)>=3 then raise exception 'limite'; end if;
  select name into v_name from public.profiles where id=auth.uid();
  insert into public.appointments(user_id,name,service,barber,fecha,hora,comments)
    values(auth.uid(),coalesce(v_name,'Cliente'),left(p_service,80),p_barber,p_date,p_time,left(coalesce(p_comments,''),300)) returning id into v_id;
  return v_id;
exception when unique_violation then raise exception 'ocupado';
end $$;

create function public.responder_cita(p_id bigint,p_aceptar boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then raise exception 'no_admin'; end if;
  if p_aceptar then
    update public.appointments set status='aceptada' where id=p_id and status='pendiente' and created_at>now()-interval '20 minutes';
    if not found then raise exception 'expirada'; end if;
  else
    update public.appointments set status='rechazada' where id=p_id and status in ('pendiente','aceptada');
  end if;
end $$;

revoke all on function public.reservar_cita(text,text,date,time,text) from public,anon;
revoke all on function public.responder_cita(bigint,boolean) from public,anon;
grant execute on function public.reservar_cita(text,text,date,time,text),public.responder_cita(bigint,boolean) to authenticated;
grant execute on function public.limpiar_citas(),public.horarios_ocupados(date,text) to anon,authenticated;

-- OPCIONAL (limpieza automática cada minuto, requiere activar la extensión pg_cron en Database > Extensions):
-- select cron.schedule('limpiar_citas','* * * * *','select public.limpiar_citas()');
-- Sin pg_cron igual funciona: las pendientes de más de 20 min no cuentan como ocupadas y se borran en la siguiente reserva o consulta.
