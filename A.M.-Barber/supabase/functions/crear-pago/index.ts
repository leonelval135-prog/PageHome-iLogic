// Edge Function: crea una sesión de Stripe Checkout para una cita del usuario autenticado.
// El monto se calcula AQUÍ (servidor); el navegador nunca decide cuánto se cobra.
// Despliegue: supabase functions deploy crear-pago
import { createClient } from "npm:@supabase/supabase-js@2";

// Debe coincidir con los precios de js/config.js. Solo servicios de precio fijo (en pesos MXN).
const PRECIOS: Record<string, number> = {
  "Corte desvanecido (Fade)": 150,
  "Corte clásico": 130,
  "Taper": 150,
  "Mullet": 150,
  "Corte y barba": 250,
  "Cejas": 20,
};

const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
const cors = {
  "Access-Control-Allow-Origin": SITE_URL || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);

  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  if (!sk || !SITE_URL) return json({ error: "config" }, 500);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u, error: ue } = await admin.auth.getUser(jwt);
  if (ue || !u?.user) return json({ error: "auth" }, 401);

  let body: { cita_id?: unknown };
  try { body = await req.json(); } catch { return json({ error: "datos" }, 400); }
  const id = Number(body?.cita_id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "datos" }, 400);

  const { data: c } = await admin.from("appointments")
    .select("id,user_id,service,fecha,hora,status,pago_estado,created_at").eq("id", id).maybeSingle();
  if (!c || c.user_id !== u.user.id) return json({ error: "no_encontrada" }, 404);
  if (c.status !== "pendiente" || c.pago_estado === "pagado") return json({ error: "estado" }, 409);
  if (new Date(c.created_at).getTime() + 20 * 60e3 < Date.now()) return json({ error: "expirada" }, 410);

  const precio = PRECIOS[c.service];
  if (!precio) return json({ error: "no_pagable" }, 422);
  const centavos = precio * 100;

  const p = new URLSearchParams({
    mode: "payment",
    "payment_method_types[0]": "card",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "mxn",
    "line_items[0][price_data][unit_amount]": String(centavos),
    "line_items[0][price_data][product_data][name]": `${c.service} · A.M. Barber`,
    "line_items[0][price_data][product_data][description]": `Cita ${c.fecha} ${String(c.hora).slice(0, 5)} h · Folio #${c.id}`,
    client_reference_id: String(c.id),
    "metadata[cita_id]": String(c.id),
    "payment_intent_data[metadata][cita_id]": String(c.id),
    success_url: `${SITE_URL}/?pago=ok&cita=${c.id}#cita`,
    cancel_url: `${SITE_URL}/?pago=cancelado&cita=${c.id}#cita`,
    locale: "es-419",
    expires_at: String(Math.floor(Date.now() / 1000) + 31 * 60), // Stripe exige mínimo 30 min
  });
  if (u.user.email) p.set("customer_email", u.user.email);

  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: p,
  });
  const s = await r.json();
  if (!r.ok || !s?.url) {
    console.error("stripe", r.status, s?.error?.message);
    return json({ error: "stripe" }, 502);
  }

  await admin.from("appointments")
    .update({ pago: "Tarjeta", pago_estado: "en_pago", monto_centavos: centavos, stripe_session: s.id })
    .eq("id", c.id);

  return json({ url: s.url });
});
