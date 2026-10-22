-- A.M. Ball (Barber Ball) — victorias por cuenta, clasificación y canjeo de premios.
-- Ejecutar UNA VEZ en Supabase > SQL Editor (mismo proyecto que el sitio A.M. Barber). Es seguro volver a ejecutarlo.
-- El jugador es la cuenta del sitio (auth.users.id): su nombre y sus victorias viajan con la cuenta.
-- Las victorias son acumuladas (no se reinician) y cada premio se desbloquea al llegar a su meta.

create table if not exists public.ab_premios(
  id serial primary key,
  nombre text not null,
  costo int not null check(costo>0),   -- victorias necesarias
  orden int not null default 0,
  activo boolean not null default true
);

create table if not exists public.ab_jugadores(
  player_id uuid primary key,
  nombre text not null,
  ganadas int not null default 0 check(ganadas>=0),
  perdidas int not null default 0 check(perdidas>=0),
  empates int not null default 0 check(empates>=0),
  ultimo_resultado timestamptz,
  ultima_victoria timestamptz,
  creado timestamptz not null default now()
);
create index if not exists ab_jugadores_rank on public.ab_jugadores(ganadas desc,ultima_victoria asc);

create table if not exists public.ab_partidas(
  id bigserial primary key,
  player_id uuid not null,
  resultado text not null check(resultado in('gano','perdio','empate')),
  segundos int,
  creado timestamptz not null default now()
);
create index if not exists ab_partidas_player on public.ab_partidas(player_id,creado desc);

create table if not exists public.ab_canjes(
  id bigserial primary key,
  folio text not null unique,
  player_id uuid not null,
  nombre text not null,
  premio_id int not null,
  premio text not null,
  costo int not null,
  estado text not null default 'pendiente' check(estado in('pendiente','entregado')),
  creado timestamptz not null default now(),
  entregado_en timestamptz,
  unique(player_id,premio_id)           -- cada premio se canjea una sola vez por cuenta
);
create index if not exists ab_canjes_player on public.ab_canjes(player_id,creado desc);

-- Premios iniciales (solo si la tabla está vacía). Edítalos desde Table Editor.
insert into public.ab_premios(nombre,costo,orden)
select * from (values
  ('Mascarilla de exfoliación',20,1),
  ('Mascarilla de Vitamina C',40,2),
  ('Reparador de ojeras',60,3),
  ('Mascarilla de Carbón Activo',85,4),
  ('Corte GRATIS',100,5)
) v(nombre,costo,orden)
where not exists(select 1 from public.ab_premios);

-- Seguridad: nadie toca las tablas directo; todo pasa por las funciones de abajo.
alter table public.ab_premios enable row level security;
alter table public.ab_jugadores enable row level security;
alter table public.ab_partidas enable row level security;
alter table public.ab_canjes enable row level security;
drop policy if exists "premios ball visibles" on public.ab_premios;
create policy "premios ball visibles" on public.ab_premios for select using(activo);

create or replace function public.ab_hoy() returns date language sql stable as
$$ select (now() at time zone 'America/Mexico_City')::date $$;

create or replace function public.ab_estado_json(p_player uuid) returns json language sql stable as
$$ select json_build_object(
     'ganadas',coalesce(j.ganadas,0),'perdidas',coalesce(j.perdidas,0),'empates',coalesce(j.empates,0),
     'canjeados',coalesce((select json_agg(premio_id) from public.ab_canjes where player_id=p_player),'[]'::json))
   from (select 1) x left join public.ab_jugadores j on j.player_id=p_player $$;

create or replace function public.ab_estado(p_player uuid) returns json
language sql stable security definer set search_path=public as
$$ select public.ab_estado_json(p_player) $$;

create or replace function public.ab_premios() returns json
language sql stable security definer set search_path=public as
$$ select coalesce(json_agg(json_build_object('id',id,'nombre',nombre,'costo',costo) order by costo,orden),'[]'::json)
   from public.ab_premios where activo $$;

-- Registra el resultado de una partida. Validaciones de plausibilidad:
--  · mínimo 10 s entre resultados · una victoria dura al menos 30 s · tope de 30 victorias al día (hora CDMX).
create or replace function public.ab_registrar(p_player uuid,p_nombre text,p_resultado text,p_segundos int default 0) returns json
language plpgsql security definer set search_path=public as $$
declare v_nom text; r public.ab_jugadores; n int;
begin
  if p_player is null then raise exception 'jugador'; end if;
  if p_resultado not in('gano','perdio','empate') then raise exception 'resultado'; end if;
  v_nom:=left(btrim(regexp_replace(coalesce(p_nombre,''),'[[:cntrl:]<>]','','g')),14);
  if v_nom='' then v_nom:='Jugador'; end if;
  insert into public.ab_jugadores(player_id,nombre) values(p_player,v_nom) on conflict do nothing;
  select * into r from public.ab_jugadores where player_id=p_player for update;
  if r.ultimo_resultado is not null and now()-r.ultimo_resultado<interval '10 seconds' then raise exception 'rapido'; end if;
  if p_resultado='gano' then
    if coalesce(p_segundos,0)<30 then raise exception 'invalido'; end if;
    select count(*) into n from public.ab_partidas
      where player_id=p_player and resultado='gano' and (creado at time zone 'America/Mexico_City')::date=public.ab_hoy();
    if n>=30 then raise exception 'limite'; end if;
  end if;
  insert into public.ab_partidas(player_id,resultado,segundos)
    values(p_player,p_resultado,least(greatest(coalesce(p_segundos,0),0),3600));
  update public.ab_jugadores set nombre=v_nom,
    ganadas=ganadas+(p_resultado='gano')::int,
    perdidas=perdidas+(p_resultado='perdio')::int,
    empates=empates+(p_resultado='empate')::int,
    ultimo_resultado=now(),
    ultima_victoria=case when p_resultado='gano' then now() else ultima_victoria end
    where player_id=p_player;
  return public.ab_estado_json(p_player);
end $$;

-- Top 10 por victorias (empate: quien llegó primero). "yo" marca tu propia fila sin exponer ids.
create or replace function public.ab_clasificacion(p_player uuid default null) returns json
language sql stable security definer set search_path=public as $$
  with r as(
    select player_id,nombre,ganadas,perdidas,empates,
           row_number() over(order by ganadas desc,ultima_victoria asc) pos
    from public.ab_jugadores where ganadas>0)
  select json_build_object(
    'top',(select coalesce(json_agg(json_build_object('pos',pos,'nombre',nombre,'g',ganadas,'p',perdidas,'e',empates,
            'yo',coalesce(player_id=p_player,false)) order by pos),'[]'::json) from r where pos<=10),
    'mi_pos',(select pos from r where player_id=p_player)) $$;

-- Canje: exige tener las victorias de la meta, no las descuenta y crea un folio único (una vez por premio).
create or replace function public.ab_canjear(p_player uuid,p_premio int) returns json
language plpgsql security definer set search_path=public as $$
declare pr public.ab_premios; r public.ab_jugadores; c public.ab_canjes; v_folio text; n int:=0;
begin
  if p_player is null then raise exception 'jugador'; end if;
  select * into pr from public.ab_premios where id=p_premio and activo;
  if not found then raise exception 'premio'; end if;
  select * into r from public.ab_jugadores where player_id=p_player for update;
  if not found or r.ganadas<pr.costo then raise exception 'insuficiente'; end if;
  if exists(select 1 from public.ab_canjes where player_id=p_player and premio_id=pr.id) then raise exception 'ya_canjeado'; end if;
  loop
    v_folio:='AB-'||upper(substr(md5(random()::text||clock_timestamp()::text||p_player::text),1,4))||'-'||upper(substr(md5(clock_timestamp()::text||random()::text),1,4));
    begin
      insert into public.ab_canjes(folio,player_id,nombre,premio_id,premio,costo)
        values(v_folio,p_player,r.nombre,pr.id,pr.nombre,pr.costo) returning * into c;
      exit;
    exception when unique_violation then
      if exists(select 1 from public.ab_canjes where player_id=p_player and premio_id=pr.id) then raise exception 'ya_canjeado'; end if;
      n:=n+1; if n>5 then raise; end if;
    end;
  end loop;
  return json_build_object(
    'canje',json_build_object('folio',c.folio,'nombre',c.nombre,'premio',c.premio,'costo',c.costo,
            'dia',(c.creado at time zone 'America/Mexico_City')::date,'creado',c.creado,'estado',c.estado),
    'estado',public.ab_estado_json(p_player));
end $$;

create or replace function public.ab_mis_canjes(p_player uuid) returns json
language sql stable security definer set search_path=public as $$
  select coalesce(json_agg(json_build_object('folio',folio,'nombre',nombre,'premio',premio,'costo',costo,
         'dia',(creado at time zone 'America/Mexico_City')::date,'creado',creado,'estado',estado) order by creado desc),'[]'::json)
  from (select * from public.ab_canjes where player_id=p_player order by creado desc limit 20) t $$;

create or replace function public.ab_verificar(p_folio text) returns json
language sql stable security definer set search_path=public as $$
  select json_build_object('folio',folio,'nombre',nombre,'premio',premio,'costo',costo,
         'dia',(creado at time zone 'America/Mexico_City')::date,'creado',creado,'estado',estado)
  from public.ab_canjes where folio=upper(btrim(p_folio)) $$;

-- Permisos: solo estas funciones son públicas (las auxiliares quedan cerradas).
revoke all on function public.ab_hoy(),public.ab_estado_json(uuid) from public,anon,authenticated;
revoke all on function public.ab_estado(uuid),public.ab_premios(),public.ab_registrar(uuid,text,text,int),public.ab_clasificacion(uuid),
  public.ab_canjear(uuid,int),public.ab_mis_canjes(uuid),public.ab_verificar(text) from public;
grant execute on function public.ab_estado(uuid),public.ab_premios(),public.ab_registrar(uuid,text,text,int),public.ab_clasificacion(uuid),
  public.ab_canjear(uuid,int),public.ab_mis_canjes(uuid),public.ab_verificar(text) to anon,authenticated;

-- Marcar un premio como entregado (SQL Editor / Table Editor):
--   update public.ab_canjes set estado='entregado',entregado_en=now() where folio='AB-XXXX-XXXX';
-- Opcional: las tablas pc_* del juego anterior (Penalty Cup) ya no se usan; puedes conservarlas o borrarlas.
