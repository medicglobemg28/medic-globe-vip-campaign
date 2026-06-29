import {
  generateVipCode,
  getNextVipCounter,
  json,
  normalizePhone,
  readJson,
  recordRegistrationEvent,
  toLead,
} from "../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);

  const body = await readJson(request);
  const phone = normalizePhone(body.phone);
  if (!body.name || !phone) {
    return json({ message: "Name and WhatsApp are required." }, 400);
  }
  if (!body.dueDate || body.dueDate < new Date().toISOString().slice(0, 10)) {
    return json({ message: "预产期不能早过今天。" }, 400);
  }

  const source = body.source || "unknown";
  const existing = await env.DB.prepare("SELECT * FROM leads WHERE phone = ? LIMIT 1").bind(phone).first();
  if (existing) {
    const lead = toLead(existing);
    await recordRegistrationEvent(env.DB, {
      source,
      phone,
      duplicate: true,
      vipCode: lead.vipCode,
    });
    return json({
      duplicate: true,
      lead,
    });
  }

  const counterValue = await getNextVipCounter(env.DB);
  const vipCode = generateVipCode(source, counterValue);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const lead = {
    id,
    vipCode,
    name: body.name,
    phone,
    area: body.area || "",
    dueDate: body.dueDate || "",
    interest: body.interest || "",
    source,
    giftRedeemed: false,
    createdAt,
  };

  await env.DB.prepare(
    `INSERT INTO leads (
      id, vip_code, name, phone, area, due_date, interest, source,
      gift_redeemed, whatsapp_status, whatsapp_message, whatsapp_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      vipCode,
      lead.name,
      phone,
      lead.area,
      lead.dueDate,
      lead.interest,
      source,
      "disabled",
      "WhatsApp auto-send disabled",
      null,
      createdAt,
    )
    .run();

  await recordRegistrationEvent(env.DB, {
    source,
    phone,
    duplicate: false,
    vipCode,
  });

  return json({ duplicate: false, lead });
}

export async function onRequestPatch({ request, env }) {
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);

  const body = await readJson(request);
  const vipCode = String(body.vipCode || "").trim().toUpperCase();
  const area = String(body.area || "").trim();
  if (!vipCode || !area) {
    return json({ message: "VIP code and area are required." }, 400);
  }

  const existing = await env.DB.prepare("SELECT * FROM leads WHERE vip_code = ? LIMIT 1").bind(vipCode).first();
  if (!existing) return json({ message: "找不到这个 VIP 码。" }, 404);

  await env.DB.prepare("UPDATE leads SET area = ? WHERE vip_code = ?").bind(area, vipCode).run();
  const updated = await env.DB.prepare("SELECT * FROM leads WHERE vip_code = ? LIMIT 1").bind(vipCode).first();
  return json({ lead: toLead(updated) });
}
