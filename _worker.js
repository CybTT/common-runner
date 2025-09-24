// _worker.js — Pages için "tek dosyalık" Functions
// KV binding: LEADERBOARD  (Pages > Settings > Bindings'te ekli)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // basit hello testi
    if (url.pathname === "/hello") {
      return new Response("hello from functions");
    }

    // ---- LEADERBOARD API (KV) ----
    if (url.pathname === "/api/leaderboard") {
      if (request.method === "GET") {
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
        const list = await env.LEADERBOARD.list();
        const players = [];
        for (const k of list.keys) {
          const val = await env.LEADERBOARD.get(k.name);
          const score = Number(val || 0);
          if (Number.isFinite(score)) players.push({ name: k.name, score });
        }
        players.sort((a,b)=>b.score-a.score);
        return Response.json({ ok:true, results: players.slice(0, limit) });
      }

      if (request.method === "POST") {
        let body;
        try { body = await request.json(); }
        catch { return Response.json({ ok:false, error:"invalid_json" }, { status:400 }); }

        const raw = (body.nickname ?? body.name ?? "").toString().trim();
        const name = raw.slice(0,12) || "anon";
        const score = Number(body.score ?? 0);
        if (!Number.isFinite(score) || score < 0) {
          return Response.json({ ok:false, error:"invalid_score" }, { status:400 });
        }

        const existing = await env.LEADERBOARD.get(name);
        const best = Number(existing ?? -Infinity);
        const finalScore = Number.isFinite(best) ? Math.max(best, Math.floor(score)) : Math.floor(score);
        await env.LEADERBOARD.put(name, String(finalScore));
        return Response.json({ ok:true });
      }

      return new Response("Method Not Allowed", { status: 405 });
    }
    // ---- /LEADERBOARD API ----

    // Diğer tüm istekler: statik dosyaları (index.html) servis et
    return env.ASSETS.fetch(request);
  }
};
