import { ensureScansTable, json, readJson } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ message: "D1 binding DB is missing." }, 500);

  await ensureScansTable(env.DB);

  const body = await readJson(request);
  const source = String(body.source || "unknown").trim().slice(0, 80) || "unknown";
  const path = String(body.path || "").slice(0, 240);
  const userAgent = String(request.headers.get("User-Agent") || "").slice(0, 300);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO scans (id, source, path, user_agent, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(id, source, path, userAgent, now)
    .run();

  return json({ ok: true });
}
