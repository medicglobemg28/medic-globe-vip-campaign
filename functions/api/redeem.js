import { json, normalizePhone, readJson, toLead } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);

  const body = await readJson(request);
  if (body.action === "lookup") {
    const lookup = String(body.lookup || "").trim();
    const phone = normalizePhone(lookup);
    const row = await env.DB.prepare(
      "SELECT * FROM leads WHERE lower(vip_code) = lower(?) OR phone = ? LIMIT 1",
    )
      .bind(lookup, phone)
      .first();
    if (!row) return json({ message: "找不到记录，请确认 VIP 码或 WhatsApp。" }, 404);
    return json({ lead: toLead(row) });
  }

  if (body.action === "confirm") {
    const vipCode = String(body.vipCode || "").trim().toUpperCase();
    const existing = await env.DB.prepare("SELECT * FROM leads WHERE vip_code = ? LIMIT 1")
      .bind(vipCode)
      .first();
    if (!existing) return json({ message: "找不到这个 VIP 码。" }, 404);
    if (!existing.gift_redeemed) {
      await env.DB.prepare("UPDATE leads SET gift_redeemed = 1, redeemed_at = ? WHERE vip_code = ?")
        .bind(new Date().toISOString(), vipCode)
        .run();
    }
    const row = await env.DB.prepare("SELECT * FROM leads WHERE vip_code = ? LIMIT 1").bind(vipCode).first();
    return json({ lead: toLead(row) });
  }

  return json({ message: "Unsupported redeem action." }, 400);
}
