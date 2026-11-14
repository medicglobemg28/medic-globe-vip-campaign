import { json, readJson, sendWhatsApp } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const result = await sendWhatsApp(env, body, new URL(request.url).origin);
  return json(result, result.status === "failed" ? 400 : 200);
}
