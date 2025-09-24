// KV sürümü (D1 yok). Binding adı: LEADERBOARD
// GET  /api/leaderboard?limit=50  -> Top N (varsayılan 50)
// POST /api/leaderboard           -> { nickname, score }  (name de kabul ediyor)

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

  // KV'deki tüm anahtarları (nickleri) listeler
  const list = await env.LEADERBOARD.list();
  const players = [];

  // Her anahtarın değerini (skor) oku
  for (const k of list.keys) {
    const val = await env.LEADERBOARD.get(k.name);
    const score = Number(val || 0);
    if (Number.isFinite(score)) {
      players.push({ name: k.name, score });
    }
  }

  // Skorları yüksekten düşüğe sırala ve limit kadarını döndür
  players.sort((a, b) => b.score - a.score);
  return new Response(JSON.stringify({ ok: true, results: players.slice(0, limit) }), {
    headers: { "content-type": "application/json" }
  });
}

export async function onRequestPost({ env, request }) {
  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ ok:false, error:"invalid_json" }), { status:400 }); }

  // İsim alanı: nickname ya da name (ikisini de destekliyoruz)
  const raw = (body.nickname ?? body.name ?? "").toString().trim();
  const name = raw.slice(0, 12) || "anon";
  const score = Number(body.score ?? 0);

  if (!Number.isFinite(score) || score < 0)
    return new Response(JSON.stringify({ ok:false, error:"invalid_score" }), { status:400 });

  // Aynı isim gelirse KV'de o ismin skorunu günceller (en basit kural)
  // Eğer "sadece artarsa güncelle" istiyorsan alttaki if bloğunu kullan:
  const existingVal = await env.LEADERBOARD.get(name);
  const best = Number(existingVal ?? -Infinity);
  const finalScore = Number.isFinite(best) ? Math.max(best, Math.floor(score)) : Math.floor(score);

  await env.LEADERBOARD.put(name, String(finalScore));

  return new Response(JSON.stringify({ ok:true }), {
    headers: { "content-type": "application/json" }
  });
}
