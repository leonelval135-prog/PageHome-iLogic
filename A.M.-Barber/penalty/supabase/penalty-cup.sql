-- MB Barber · Penalty Cup — clasificación diaria + canjeo de premios.
-- Ejecutar UNA VEZ en Supabase > SQL Editor (mismo proyecto que el sitio A.M. Barber).
-- El "día" se calcula en el servidor con hora de Ciudad de México:
-- inicia a las 00:00 y termina a las 23:59:59. Cada fila lleva su fecha, así que
-- el nuevo día empieza en cero solo, sin cron ni tareas programadas.

create table if not exists public.pc_premios(
  id serial primary key,
  nombre text not null,
  costo int not null check(costo>0),   -- goles que cuesta
  orden int not null default 0,
  activo boolean not null default true
);

create table if not exists public.pc_puntos(
  dia date not null,
  player_id uuid not null,
  nombre text not null,
  goles int not null default 0 check(goles>=0),
  canjeados int not null default 0 check(canjeados>=0),  -- goles gastados en canjes
  ultimo_gol timestamptz,
  creado timestamptz not null default now(),
  primary key(dia,player_id)
);
create index if not exists pc_puntos_rank on public.pc_puntos(dia,goles desc);

create table if not exists public.pc_canjes(
  id bigserial primary key,
  folio text not null unique,
  dia date not null,
  player_id uuid not null,
  nombre text not null,
  premio text not null,
  costo int not null,
  estado text not null default 'pendiente' check(estado in('pendiente','entregado')),
  creado timestamptz not null default now(),
  entregado_en timestamptz
);
create index if not exists pc_canjes_player on public.pc_canjes(player_id,creado desc);

-- Premios iniciales (solo si la tabla está vacía). Edítalos desde Table Editor.
insert into public.pc_premios(nombre,costo,orden)
select * from (values
  ('Mascarilla de exfoliación',50,1),
  ('Mascarilla de Vitamina C',60,2),
  ('Reparador de ojeras',70,3),
  ('Mascarilla de Carbón Activo',75,4),
  ('Corte GRATIS',100,5)
) v(nombre,costo,orden)
where not exists(select 1 from public.pc_premios);

-- Seguridad: nadie toca las tablas directo; todo pasa por las funciones de abajo.
alter table public.pc_premios enable row level security;
alter table public.pc_puntos enable row level security;
alter table public.pc_canjes enable row level security;
drop policy if exists "premios visibles" on public.pc_premios;
create policy "premios visibles" on public.pc_premios for select using(activo);

create or replace function public.pc_hoy() returns date language sql stable as
$$ select (now() at time zone 'America/Mexico_City')::date $$;

create or replace function public.pc_segundos() returns int language sql stable as
$$ select ceil(extract(epoch from (date_trunc('day',now() at time zone 'America/Mexico_City')+interval '1 day')-(now() at time zone 'America/Mexico_City')))::int $$;

create or replace function public.pc_estado_json(p_player uuid) returns json language sql stable as
$$ select json_build_object(
     'dia',public.pc_hoy(),'segundos',public.pc_segundos(),
     'goles',coalesce(p.goles,0),'canjeados',coalesce(p.canjeados,0),
     'saldo',coalesce(p.goles-p.canjeados,0))
   from (select 1) x left join public.pc_puntos p on p.dia=public.pc_hoy() and p.player_id=p_player $$;

create or replace function public.pc_estado(p_player uuid) returns json
language sql stable security definer set search_path=public as
$$ select public.pc_estado_json(p_player) $$;

create or replace function public.pc_premios() returns json
language sql stable security definer set search_path=public as
$$ select coalesce(json_agg(json_build_object('id',id,'nombre',nombre,'costo',costo) order by costo,orden),'[]'::json)
   from public.pc_premios where activo $$;

-- +1 gol. Valida: mínimo 1.5 s entre goles y tope de 200 goles al día por jugador.
create or replace function public.pc_registrar_gol(p_player uuid,p_nombre text) returns json
language plpgsql security definer set search_path=public as $$
declare v_dia date:=public.pc_hoy(); v_nom text; r public.pc_puntos;
begin
  if p_player is null then raise exception 'jugador'; end if;
  v_nom:=left(btrim(regexp_replace(coalesce(p_nombre,''),'[[:cntrl:]<>]','','g')),14);
  if v_nom='' then v_nom:='Jugador'; end if;
  insert into public.pc_puntos(dia,player_id,nombre) values(v_dia,p_player,v_nom) on conflict do nothing;
  select * into r from public.pc_puntos where dia=v_dia and player_id=p_player for update;
  if r.ultimo_gol is not null and now()-r.ultimo_gol<interval '1.5 seconds' then raise exception 'rapido'; end if;
  if r.goles>=200 then raise exception 'limite'; end if;
  update public.pc_puntos set goles=goles+1,nombre=v_nom,ultimo_gol=now() where dia=v_dia and player_id=p_player;
  return public.pc_estado_json(p_player);
end $$;

-- Top 10 de HOY (empate: quien llegó primero). "yo" marca tu propia fila sin exponer ids.
create or replace function public.pc_clasificacion(p_player uuid default null) returns json
language sql stable security definer set search_path=public as $$
  with r as(
    select player_id,nombre,goles,row_number() over(order by goles desc,ultimo_gol asc) pos
    from public.pc_puntos where dia=public.pc_hoy() and goles>0)
  select json_build_object(
    'dia',public.pc_hoy(),'segundos',public.pc_segundos(),
    'top',(select coalesce(json_agg(json_build_object('pos',pos,'nombre',nombre,'goles',goles,'yo',coalesce(player_id=p_player,false)) order by pos),'[]'::json) from r where pos<=10),
    'mi_pos',(select pos from r where player_id=p_player)) $$;

-- Canje: descuenta goles de HOY y crea un folio único. El saldo = goles - canjeados.
create or replace function public.pc_canjear(p_player uuid,p_premio int) returns json
language plpgsql security definer set search_path=public as $$
declare v_dia date:=public.pc_hoy(); pr public.pc_premios; r public.pc_puntos; v_folio text; c public.pc_canjes; n int:=0;
begin
  if p_player is null then raise exception 'jugador'; end if;
  select * into pr from public.pc_premios where id=p_premio and activo;
  if not found then raise exception 'premio'; end if;
  select * into r from public.pc_puntos where dia=v_dia and player_id=p_player for update;
  if not found then raise exception 'sin_puntos'; end if;
  if r.goles-r.canjeados<pr.costo then raise exception 'insuficiente'; end if;
  update public.pc_puntos set canjeados=canjeados+pr.costo where dia=v_dia and player_id=p_player;
  loop
    v_folio:='MB-'||upper(substr(md5(random()::text||clock_timestamp()::text||p_player::text),1,4))||'-'||upper(substr(md5(clock_timestamp()::text||random()::text),1,4));
    begin
      insert into public.pc_canjes(folio,dia,player_id,nombre,premio,costo) values(v_folio,v_dia,p_player,r.nombre,pr.nombre,pr.costo) returning * into c;
      exit;
    exception when unique_violation then n:=n+1; if n>5 then raise; end if;
    end;
  end loop;
  return json_build_object('canje',json_build_object('folio',c.folio,'nombre',c.nombre,'premio',c.premio,'costo',c.costo,'dia',c.dia,'creado',c.creado,'estado',c.estado),
                           'estado',public.pc_estado_json(p_player));
end $$;

create or replace function public.pc_mis_canjes(p_player uuid) returns json
language sql stable security definer set search_path=public as $$
  select coalesce(json_agg(json_build_object('folio',folio,'nombre',nombre,'premio',premio,'costo',costo,'dia',dia,'creado',creado,'estado',estado) order by creado desc),'[]'::json)
  from (select * from public.pc_canjes where player_id=p_player order by creado desc limit 20) t $$;

create or replace function public.pc_verificar(p_folio text) returns json
language sql stable security definer set search_path=public as $$
  select json_build_object('folio',folio,'nombre',nombre,'premio',premio,'costo',costo,'dia',dia,'creado',creado,'estado',estado)
  from public.pc_canjes where folio=upper(btrim(p_folio)) $$;

-- Permisos: solo estas funciones son públicas (las auxiliares quedan cerradas).
revoke all on function public.pc_hoy(),public.pc_segundos(),public.pc_estado_json(uuid) from public,anon,authenticated;
revoke all on function public.pc_estado(uuid),public.pc_premios(),public.pc_registrar_gol(uuid,text),public.pc_clasificacion(uuid),
  public.pc_canjear(uuid,int),public.pc_mis_canjes(uuid),public.pc_verificar(text) from public;
grant execute on function public.pc_estado(uuid),public.pc_premios(),public.pc_registrar_gol(uuid,text),public.pc_clasificacion(uuid),
  public.pc_canjear(uuid,int),public.pc_mis_canjes(uuid),public.pc_verificar(text) to anon,authenticated;

-- Marcar un premio como entregado (hazlo desde SQL Editor / Table Editor):
--   update public.pc_canjes set estado='entregado',entregado_en=now() where folio='MB-XXXX-XXXX';
-- Opcional (limpieza de historial viejo, con pg_cron activo):
--   select cron.schedule('pc-limpieza','5 6 * * *',$$delete from public.pc_puntos where dia<public.pc_hoy()-30$$);
