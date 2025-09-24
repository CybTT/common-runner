export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
  const stmt = env.DB.prepare(
    "SELECT name, score, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT ?"
  );
  const { results } = await stmt.bind(limit).all();
  return new Response(JSON.stringify({ ok:true, results }), {
    headers: { "content-type": "application/json" }
  });
}

export async function onRequestPost({ env, request }) {
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ ok:false, error:"invalid_json" }), { status:400 });
  }
  const nameRaw = (body.name ?? "").toString().trim();
  const score = Number(body.score ?? 0);
  const name = nameRaw.slice(0, 12) || "anon";

  if (!Number.isFinite(score) || score < 0)
    return new Response(JSON.stringify({ ok:false, error:"invalid_score" }), { status:400 });
  if (score < 5)
    return new Response(JSON.stringify({ ok:false, error:"too_low" }), { status:400 });

  await env.DB.prepare(
    "INSERT INTO scores (name, score, created_at) VALUES (?, ?, ?)"
  ).bind(name, Math.floor(score), Date.now()).run();

  return new Response(JSON.stringify({ ok:true }), {
    headers: { "content-type":"application/json" }
  });
}
