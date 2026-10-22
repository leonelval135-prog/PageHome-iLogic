-- A.M. Ball v1.17 — Un canje cada 30 días por cuenta Y por conexión (IP).
-- Ejecutar UNA VEZ en Supabase > SQL Editor, DESPUÉS de a-m-ball.sql. Es seguro volver a ejecutarlo.
--
-- Cómo funciona:
--  · La IP la lee el SERVIDOR (cabeceras de la petición que PostgREST expone en request.headers), no el navegador,
--    así que el jugador no puede mandar una IP falsa desde el cliente.
--  · Nunca se guarda la IP en claro: solo una huella SHA-256 con una sal secreta (tabla ab_config, sin acceso público).
--  · IPv4 se compara completa; IPv6 por prefijo /64 (un mismo hogar/dispositivo rota direcciones dentro de su /64).
--  · Si una cuenta O una IP canjeó un premio en los últimos 30 días, no se puede canjear otro hasta que se cumplan.
--    Seguir jugando y sumando victorias NO está limitado.
--  · La huella de IP deja de ser útil a los 30 días y se borra automáticamente (limpieza en cada canje).

-- 1) Sal secreta y columna de huella
create table if not exists public.ab_config(clave text primary key, valor text not null);
alter table public.ab_config enable row level security;      -- sin políticas: nadie la lee desde el cliente
revoke all on public.ab_config from public,anon,authenticated;
insert into public.ab_config(clave,valor)
  select 'ip_sal', md5(random()::text||clock_timestamp()::text||gen_random_uuid()::text)||md5(gen_random_uuid()::text)
  where not exists(select 1 from public.ab_config where clave='ip_sal');

alter table public.ab_canjes add column if not exists ip_hash text;
create index if not exists ab_canjes_ip on public.ab_canjes(ip_hash,creado desc) where ip_hash is not null;

-- 2) IP del cliente (la que ve el servidor) y su huella
create or replace function public.ab_ip() returns text language plpgsql stable as $$
declare h json; ip text; i inet;
begin
  begin h:=nullif(current_setting('request.headers',true),'')::json; exception when others then return null; end;
  if h is null then return null; end if;
  -- Supabase va detrás de Cloudflare: cf-connecting-ip es la IP real y no la puede fijar el cliente.
  ip:=coalesce(nullif(btrim(h->>'cf-connecting-ip'),''),
               nullif(btrim(h->>'x-real-ip'),''),
               nullif(btrim(split_part(coalesce(h->>'x-forwarded-for',''),',',1)),''));
  if ip is null then return null; end if;
  begin i:=ip::inet; exception when others then return null; end;
  if family(i)=6 then i:=set_masklen(i,64); else i:=set_masklen(i,32); end if;
  return host(network(i));
end $$;

create or replace function public.ab_ip_hash() returns text language plpgsql stable security definer set search_path=public as $$
declare ip text; sal text;
begin
  ip:=public.ab_ip(); if ip is null then return null; end if;
  select valor into sal from public.ab_config where clave='ip_sal';
  return encode(sha256(convert_to(coalesce(sal,'')||ip,'UTF8')),'hex');
end $$;

-- 3) ¿Hay un bloqueo vigente? Devuelve {"hasta": <timestamptz>, "por": "cuenta"|"ip"} o null.
create or replace function public.ab_limite(p_player uuid) returns json language plpgsql stable security definer set search_path=public as $$
declare v_hash text:=public.ab_ip_hash(); a timestamptz; b timestamptz;
begin
  select max(creado) into a from public.ab_canjes where player_id=p_player and creado>now()-interval '30 days';
  if a is not null then return json_build_object('hasta',a+interval '30 days','por','cuenta'); end if;
  if v_hash is not null then
    select max(creado) into b from public.ab_canjes where ip_hash=v_hash and creado>now()-interval '30 days';
    if b is not null then return json_build_object('hasta',b+interval '30 days','por','ip'); end if;
  end if;
  return null;
end $$;

-- 4) Estado del jugador (ahora incluye el bloqueo, para que el juego lo muestre)
create or replace function public.ab_estado_json(p_player uuid) returns json language sql stable as
$$ select json_build_object(
     'ganadas',coalesce(j.ganadas,0),'perdidas',coalesce(j.perdidas,0),'empates',coalesce(j.empates,0),
     'canjeados',coalesce((select json_agg(premio_id) from public.ab_canjes where player_id=p_player),'[]'::json),
     'limite',public.ab_limite(p_player))
   from (select 1) x left join public.ab_jugadores j on j.player_id=p_player $$;

-- 5) Canje con límite por cuenta + IP. Errores: 'cooldown|AAAA-MM-DD' (la cuenta ya canjeó),
--    'cooldown_ip|AAAA-MM-DD' (esa conexión ya canjeó desde otra cuenta), 'sin_ip' (no se pudo verificar la conexión).
create or replace function public.ab_canjear(p_player uuid,p_premio int) returns json
language plpgsql security definer set search_path=public as $$
declare pr public.ab_premios; r public.ab_jugadores; c public.ab_canjes; v_folio text; n int:=0; v_hash text; lim json;
begin
  if p_player is null then raise exception 'jugador'; end if;
  select * into pr from public.ab_premios where id=p_premio and activo;
  if not found then raise exception 'premio'; end if;
  select * into r from public.ab_jugadores where player_id=p_player for update;
  if not found or r.ganadas<pr.costo then raise exception 'insuficiente'; end if;
  if exists(select 1 from public.ab_canjes where player_id=p_player and premio_id=pr.id) then raise exception 'ya_canjeado'; end if;

  v_hash:=public.ab_ip_hash();
  if v_hash is null then raise exception 'sin_ip'; end if;
  -- Serializa canjes simultáneos desde la misma conexión (dos cuentas a la vez no pueden esquivar el límite).
  perform pg_advisory_xact_lock(hashtextextended(v_hash,0));
  -- Limpieza: la huella ya no sirve pasados 30 días.
  update public.ab_canjes set ip_hash=null where ip_hash is not null and creado<now()-interval '31 days';

  lim:=public.ab_limite(p_player);
  if lim is not null then
    raise exception '%|%', case when lim->>'por'='ip' then 'cooldown_ip' else 'cooldown' end,
      ((lim->>'hasta')::timestamptz at time zone 'America/Mexico_City')::date;
  end if;

  loop
    v_folio:='AB-'||upper(substr(md5(random()::text||clock_timestamp()::text||p_player::text),1,4))||'-'||upper(substr(md5(clock_timestamp()::text||random()::text),1,4));
    begin
      insert into public.ab_canjes(folio,player_id,nombre,premio_id,premio,costo,ip_hash)
        values(v_folio,p_player,r.nombre,pr.id,pr.nombre,pr.costo,v_hash) returning * into c;
      exit;
    exception when unique_violation then
      if exists(select 1 from public.ab_canjes where player_id=p_player and premio_id=pr.id) then raise exception 'ya_canjeado'; end if;
      n:=n+1; if n>5 then raise; end if;
    end;
  end loop;
  return json_build_object(
    'canje',json_build_object('folio',c.folio,'nombre',c.nombre,'premio',c.premio,'costo',c.costo,
            'dia',(c.creado at time zone 'America/Mexico_City')::date,'creado',c.creado,'estado',c.estado,
            'proximo',((c.creado+interval '30 days') at time zone 'America/Mexico_City')::date),
    'estado',public.ab_estado_json(p_player));
end $$;

-- Diagnóstico: comprueba que el servidor sí ve la IP del visitante (no devuelve la IP). Responde true/false.
create or replace function public.ab_ip_ok() returns boolean language sql stable security definer set search_path=public as
$$ select public.ab_ip() is not null $$;

-- 6) Permisos: solo las funciones públicas del juego; las auxiliares quedan cerradas.
revoke all on function public.ab_ip(),public.ab_ip_hash(),public.ab_limite(uuid),public.ab_estado_json(uuid) from public,anon,authenticated;
revoke all on function public.ab_canjear(uuid,int) from public;
grant execute on function public.ab_canjear(uuid,int) to anon,authenticated;
revoke all on function public.ab_ip_ok() from public;
grant execute on function public.ab_ip_ok() to anon,authenticated;

-- Probar que la detección funciona: desde la web del juego (consola del navegador) o con curl al endpoint /rest/v1/rpc/ab_ip_ok → debe responder true.
-- Para revisar (solo tú, desde el SQL Editor): canjes de los últimos 30 días y cuántos comparten conexión.
--   select ip_hash is not null as con_huella, count(*) from public.ab_canjes where creado>now()-interval '30 days' group by 1;
-- Para liberar a un jugador legítimo bloqueado por IP compartida (p. ej. el wifi de la barbería):
--   update public.ab_canjes set ip_hash=null where folio='AB-XXXX-XXXX';
