-- Si YA ejecutaste citas.sql, ejecuta solo esto (Supabase > SQL Editor):
create or replace function public.reservar_cita(p_service text,p_barber text,p_date date,p_time time,p_comments text) returns bigint language plpgsql security definer set search_path=public as $$
declare v_name text; v_id bigint; v_now timestamp:=now() at time zone 'America/Mexico_City'; v_close time;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  if p_barber<>'Ángel Murillo' then raise exception 'fuera_horario'; end if;
  v_close:=case when extract(dow from p_date)=0 then time '17:00' else time '20:00' end;
  if p_time<time '11:00' or p_time>=v_close or extract(minute from p_time) not in (0,35) then raise exception 'fuera_horario'; end if;
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
