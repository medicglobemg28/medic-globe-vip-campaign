export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const home = new URL("/", url);
  if (!env.DB) return Response.redirect(home, 302);

  const id = url.searchParams.get("id");
  if (!id) return Response.redirect(home, 302);

  const partner = await env.DB.prepare("SELECT link FROM partners WHERE id = ? LIMIT 1").bind(id).first();
  if (!partner?.link) return Response.redirect(home, 302);

  await env.DB.prepare("UPDATE partners SET clicks = clicks + 1 WHERE id = ?").bind(id).run();
  return Response.redirect(partner.link, 302);
}
