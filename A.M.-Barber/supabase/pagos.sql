-- PAGOS CON TARJETA (Stripe). Ejecutar en Supabase > SQL Editor DESPUÉS de citas.sql (y de migracion-hoy-y-manana.sql si aplica).
-- Es seguro ejecutarlo más de una vez.

alter table public.appointments
  add column if not exists pago text not null default 'Efectivo',
  add column if not exists pago_estado text not null default 'no_aplica',
  add column if not exists monto_centavos integer,
  add column if not exists stripe_session text,
  add column if not exists stripe_payment_intent text;

do $$ begin
  alter table public.appointments add constraint appointments_pago_estado_chk check (pago_estado in ('no_aplica','en_pago','pagado'));
exception when duplicate_object then null; end $$;

-- Las citas ya pagadas NO se liberan a los 20 minutos: esperan a que el barbero las acepte o rechace.
create or replace function public.limpiar_citas() returns void language sql security definer set search_path=public as $$
  delete from public.appointments where status='pendiente' and pago_estado<>'pagado' and created_at<now()-interval '20 minutes'; $$;

create or replace function public.horarios_ocupados(p_date date,p_barber text) returns table(t time) language sql security definer set search_path=public as $$
  select hora from public.appointments where fecha=p_date and barber=p_barber
    and (status='aceptada' or (status='pendiente' and (pago_estado='pagado' or created_at>now()-interval '20 minutes'))); $$;

-- El barbero puede aceptar una cita pagada aunque hayan pasado más de 20 minutos.
create or replace function public.responder_cita(p_id bigint,p_aceptar boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then raise exception 'no_admin'; end if;
  if p_aceptar then
    update public.appointments set status='aceptada' where id=p_id and status='pendiente' and (created_at>now()-interval '20 minutes' or pago_estado='pagado');
    if not found then raise exception 'expirada'; end if;
  else
    update public.appointments set status='rechazada' where id=p_id and status in ('pendiente','aceptada');
  end if;
end $$;

-- Un cliente no puede borrar una cita que ya pagó (el reembolso lo gestiona el negocio).
drop policy if exists "cancelar mi cita pendiente" on public.appointments;
create policy "cancelar mi cita pendiente" on public.appointments for delete to authenticated
  using(auth.uid()=user_id and status='pendiente' and pago_estado<>'pagado');

-- Los clientes NO pueden modificar pago_estado: no existe política de UPDATE; solo la Edge Function (service_role) lo cambia.
