import { json, readJson, toConversion } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);

  const body = await readJson(request);
  const vipCode = String(body.vipCode || "").trim().toUpperCase();
  const lead = await env.DB.prepare("SELECT vip_code FROM leads WHERE vip_code = ? LIMIT 1").bind(vipCode).first();
  if (!lead) return json({ message: "找不到这个 VIP 码。请确认后再提交。" }, 404);

  const conversion = {
    id: crypto.randomUUID(),
    vipCode,
    partnerId: body.partnerId || "",
    stage: body.stage || "consulted",
    amount: Number(body.amount || 0),
    notes: body.notes || "",
    createdAt: new Date().toISOString(),
  };

  await env.DB.prepare(
    "INSERT INTO conversions (id, vip_code, partner_id, stage, amount, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      conversion.id,
      conversion.vipCode,
      conversion.partnerId,
      conversion.stage,
      conversion.amount,
      conversion.notes,
      conversion.createdAt,
    )
    .run();

  return json({ conversion });
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);
  const { results } = await env.DB.prepare("SELECT * FROM conversions ORDER BY created_at DESC").all();
  return json({ conversions: results.map(toConversion) });
}
