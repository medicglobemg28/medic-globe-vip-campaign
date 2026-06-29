export function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return json({ message: "Admin password is not configured." }, 401);
  }
  const password = request.headers.get("X-Admin-Password") || "";
  if (password !== env.ADMIN_PASSWORD) {
    return json({ message: "请输入正确的后台密码。" }, 401);
  }
  return null;
}

export function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

export function formatWhatsAppPhone(phone) {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("60")) return digits;
  if (digits.startsWith("0")) return `6${digits}`;
  if (digits.length >= 9 && digits.length <= 10) return `60${digits}`;
  return digits;
}

export function generateVipCode(source, counterValue) {
  const prefix = source.includes("gyn")
    ? "GYN"
    : source.includes("tcm")
      ? "TCM"
      : source.includes("baby")
        ? "BABY"
        : source.includes("expo")
          ? "EXPO"
          : "VIP";
  return `VIP-${prefix}-${String(counterValue).padStart(4, "0")}`;
}

export function toLead(row) {
  if (!row) return null;
  return {
    id: row.id,
    vipCode: row.vip_code,
    name: row.name,
    phone: row.phone,
    area: row.area,
    dueDate: row.due_date,
    interest: row.interest,
    source: row.source,
    giftRedeemed: Boolean(row.gift_redeemed),
    redeemedAt: row.redeemed_at,
    whatsappStatus: row.whatsapp_status,
    whatsappMessage: row.whatsapp_message,
    whatsappAt: row.whatsapp_at,
    createdAt: row.created_at,
  };
}

export function toConversion(row) {
  if (!row) return null;
  return {
    id: row.id,
    vipCode: row.vip_code,
    partnerId: row.partner_id,
    stage: row.stage,
    amount: Number(row.amount || 0),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function toPartner(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    area: row.area,
    link: row.link,
    linkLabel: row.link_label,
    clicks: Number(row.clicks || 0),
    createdAt: row.created_at,
  };
}

export function toScan(row) {
  if (!row) return null;
  return {
    id: row.id,
    source: row.source,
    path: row.path,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

export function toRegistrationEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    source: row.source,
    phone: row.phone,
    duplicate: Boolean(row.duplicate),
    vipCode: row.vip_code,
    createdAt: row.created_at,
  };
}

export async function ensureScansTable(DB) {
  await DB.prepare(
    `CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      path TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    )`,
  ).run();
  await DB.prepare("CREATE INDEX IF NOT EXISTS idx_scans_source ON scans (source)").run();
  await DB.prepare("CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans (created_at)").run();
}

export async function ensureRegistrationEventsTable(DB) {
  await DB.prepare(
    `CREATE TABLE IF NOT EXISTS registration_events (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      phone TEXT,
      duplicate INTEGER DEFAULT 0,
      vip_code TEXT,
      created_at TEXT NOT NULL
    )`,
  ).run();
  await DB.prepare("CREATE INDEX IF NOT EXISTS idx_registration_events_source ON registration_events (source)").run();
  await DB.prepare("CREATE INDEX IF NOT EXISTS idx_registration_events_created_at ON registration_events (created_at)").run();
}

export async function recordRegistrationEvent(DB, { source, phone, duplicate, vipCode }) {
  await ensureRegistrationEventsTable(DB);
  await DB.prepare(
    "INSERT INTO registration_events (id, source, phone, duplicate, vip_code, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(
      crypto.randomUUID(),
      String(source || "unknown"),
      phone || "",
      duplicate ? 1 : 0,
      vipCode || "",
      new Date().toISOString(),
    )
    .run();
}

export async function getNextVipCounter(DB) {
  await DB.prepare("INSERT OR IGNORE INTO counters (name, value) VALUES ('vip', 1)").run();
  const row = await DB.prepare("UPDATE counters SET value = value + 1 WHERE name = 'vip' RETURNING value").first();
  return Number(row.value) - 1;
}

export async function sendWhatsApp(env, body) {
  const phone = formatWhatsAppPhone(body.phone);
  if (!phone) {
    return { status: "failed", message: "Invalid WhatsApp phone number." };
  }

  const templateName = env.WHATSAPP_TEMPLATE_NAME || "medic_globe_vip_code";
  const languageCode = env.WHATSAPP_LANGUAGE_CODE || "zh_CN";
  const supportPhone = env.WHATSAPP_SUPPORT_PHONE || "60165397128";
  const partnerList = Array.isArray(body.partners)
    ? body.partners.slice(0, 4).join("\n")
    : "永生 SWS28 合作月子中心名单";

  const templateVariables = [
    body.name || "妈咪",
    body.vipCode || "-",
    body.sourceLabel || body.source || "永生 SWS28 合作点",
    partnerList,
    body.redeemLink || "https://vip.medicglobe.com.my/#redeem",
    supportPhone,
  ];

  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return {
      status: "dry-run",
      message:
        "已进入 WhatsApp 测试模式。加入 WHATSAPP_TOKEN 和 WHATSAPP_PHONE_NUMBER_ID 后会真实发送。",
      preview: {
        to: phone,
        template: templateName,
        language: languageCode,
        variables: templateVariables,
      },
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: "body",
              parameters: templateVariables.map((text) => ({
                type: "text",
                text: String(text),
              })),
            },
          ],
        },
      }),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    return {
      status: "failed",
      message: payload.error?.message || "WhatsApp API send failed.",
      details: payload,
    };
  }

  return {
    status: "sent",
    message: "VIP 码和合作月子中心名单已通过 WhatsApp 自动发送。",
    whatsapp: payload,
  };
}
