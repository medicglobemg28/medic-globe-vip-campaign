import { json, readJson, requireAdmin, toPartner } from "../_lib.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);
  const { results } = await env.DB.prepare("SELECT * FROM partners ORDER BY area, name").all();
  return json({ partners: results.map(toPartner) });
}

export async function onRequestPost({ request, env }) {
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);
  const body = await readJson(request);
  if (!body.name || !body.area || !body.link) {
    return json({ message: "Name, area and link are required." }, 400);
  }

  let link;
  try {
    link = new URL(body.link);
  } catch {
    return json({ message: "请输入完整链接，例如 https://facebook.com/..." }, 400);
  }

  const partner = {
    id: crypto.randomUUID(),
    name: body.name,
    area: body.area,
    link: link.toString(),
    linkLabel: body.linkLabel || "Website",
    clicks: 0,
    createdAt: new Date().toISOString(),
  };

  await env.DB.prepare(
    "INSERT INTO partners (id, name, area, link, link_label, clicks, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
  )
    .bind(partner.id, partner.name, partner.area, partner.link, partner.linkLabel, partner.createdAt)
    .run();

  return json({ partner });
}

export async function onRequestDelete({ request, env }) {
  const unauthorized = requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return json({ message: "Partner id is required." }, 400);

  const existing = await env.DB.prepare("SELECT id, name FROM partners WHERE id = ? LIMIT 1").bind(id).first();
  if (!existing) return json({ message: "找不到这个合作伙伴。" }, 404);

  await env.DB.prepare("DELETE FROM partners WHERE id = ?").bind(id).run();
  return json({ ok: true, deleted: existing });
}
