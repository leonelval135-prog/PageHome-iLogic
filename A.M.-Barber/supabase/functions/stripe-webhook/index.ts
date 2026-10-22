// Edge Function: recibe los avisos de Stripe y marca la cita como pagada.
// Despliegue (IMPORTANTE: sin verificación JWT, Stripe no envía JWT; la seguridad es la firma):
//   supabase functions deploy stripe-webhook --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

const enc = new TextEncoder();

function igual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Verifica la firma "Stripe-Signature": HMAC-SHA256 de `${t}.${cuerpo}` con el secreto del webhook.
async function firmaValida(body: string, header: string, secret: string) {
  let t = "";
  const sigs: string[] = [];
  for (const kv of header.split(",")) {
    const i = kv.indexOf("=");
    const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim();
    if (k === "t") t = v; else if (k === "v1") sigs.push(v);
  }
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${body}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => igual(s, hex));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("metodo", { status: 405 });
  const sk = Deno.env.get("STRIPE_SECRET_KEY"), wh = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sk || !wh) return new Response("config", { status: 500 });

  const body = await req.text();
  if (!(await firmaValida(body, req.headers.get("stripe-signature") ?? "", wh))) return new Response("firma", { status: 400 });

  let ev: { type: string; data: { object: Record<string, any> } };
  try { ev = JSON.parse(body); } catch { return new Response("json", { status: 400 }); }
  if (ev.type !== "checkout.session.completed") return new Response("ok");

  const o = ev.data.object;
  if (o.payment_status !== "paid") return new Response("ok");
  const id = Number(o.metadata?.cita_id);
  const pi = String(o.payment_intent ?? "");
  if (!Number.isInteger(id) || !pi) return new Response("ok");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const reembolsar = async () => {
    const r = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ payment_intent: pi, reason: "requested_by_customer", "metadata[motivo]": "cita no disponible o pago duplicado" }),
    });
    if (!r.ok) throw new Error("refund " + r.status);
  };

  try {
    const { data: row, error } = await admin.from("appointments")
      .select("id,status,pago_estado,stripe_payment_intent").eq("id", id).maybeSingle();
    if (error) throw error;

    if (row?.pago_estado === "pagado") {
      // Reintento de Stripe del mismo pago: nada que hacer. Pago distinto sobre la misma cita: se devuelve.
      if (row.stripe_payment_intent && row.stripe_payment_intent !== pi) await reembolsar();
      return new Response("ok");
    }
    if (row && row.status !== "rechazada") {
      const { error: e2 } = await admin.from("appointments")
        .update({ pago: "Tarjeta", pago_estado: "pagado", monto_centavos: o.amount_total ?? null, stripe_payment_intent: pi })
        .eq("id", id);
      if (e2) throw e2;
      return new Response("ok");
    }
    // La cita ya no existe (el horario se liberó antes del pago) o fue rechazada: devolución automática.
    await reembolsar();
    return new Response("ok");
  } catch (e) {
    console.error("webhook", e);
    return new Response("error", { status: 500 }); // Stripe reintentará
  }
});
