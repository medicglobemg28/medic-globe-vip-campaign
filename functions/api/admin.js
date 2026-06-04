import { json, toConversion, toLead, toPartner } from "../_lib.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);

  const leads = await env.DB.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
  const conversions = await env.DB.prepare("SELECT * FROM conversions ORDER BY created_at DESC").all();
  const partners = await env.DB.prepare("SELECT * FROM partners ORDER BY area, name").all();

  return json({
    leads: leads.results.map(toLead),
    conversions: conversions.results.map(toConversion),
    partners: partners.results.map(toPartner),
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);
  const body = await request.json().catch(() => ({}));
  if (body.action !== "seed") return json({ message: "Unsupported admin action." }, 400);

  const now = new Date().toISOString();
  const samples = [
    ["demo-1", "VIP-TCM-0001", "Lim Mei Mei", "0123456789", "Selangor", "2026-09", "月子中心", "tcm_ampang", 1],
    ["demo-2", "VIP-GYN-0002", "Nur Aisyah", "01122223333", "Kuala Lumpur", "2026-10", "月子中心", "gyn_pj", 0],
    ["demo-3", "VIP-BABY-0003", "Tan Xin Yi", "0169988776", "Penang", "2026-11", "月子中心", "baby_kl", 1],
  ];

  for (const row of samples) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO leads (
        id, vip_code, name, phone, area, due_date, interest, source, gift_redeemed, redeemed_at,
        whatsapp_status, whatsapp_message, whatsapp_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dry-run', '示范资料', ?, ?)`,
    )
      .bind(...row, row[8] ? now : null, now, now)
      .run();
  }

  await env.DB.prepare(
    "INSERT OR IGNORE INTO conversions (id, vip_code, partner_id, stage, amount, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind("demo-conversion-1", "VIP-TCM-0001", "diamond-baby", "signed", 12800, "示范签单资料", now)
    .run();

  await env.DB.prepare("INSERT OR REPLACE INTO counters (name, value) VALUES ('vip', 4)").run();

  return json({ message: "Demo data inserted." });
}
