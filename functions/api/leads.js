import { generateVipCode, getNextVipCounter, json, normalizePhone, readJson, sendWhatsApp, toLead } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);

  const body = await readJson(request);
  const phone = normalizePhone(body.phone);
  if (!body.name || !phone) {
    return json({ message: "Name and WhatsApp are required." }, 400);
  }

  const existing = await env.DB.prepare("SELECT * FROM leads WHERE phone = ? LIMIT 1").bind(phone).first();
  if (existing) {
    const lead = toLead(existing);
    return json({
      duplicate: true,
      lead,
      whatsapp: {
        status: lead.whatsappStatus || "sent",
        message: lead.whatsappMessage || "这个号码已经登记过，系统保留原本的 VIP 码。",
      },
    });
  }

  const source = body.source || "unknown";
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

  const whatsapp = await sendWhatsApp(env, {
    ...body,
    phone,
    vipCode,
  });

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
      whatsapp.status,
      whatsapp.message || "",
      new Date().toISOString(),
      createdAt,
    )
    .run();

  return json({ duplicate: false, lead, whatsapp });
}
