/*
 * viviascoli.com — il "portinaio" del sito su Cloudflare.
 * Serve SOLO gli indirizzi che non corrispondono a un file:
 * la home "/", le cartelle "/en/" e "/de/", gli indirizzi senza ".html"
 * e le pagine inesistenti (con la pagina 404).
 * Tutti gli altri file (pagine .html, foto, font) li serve Cloudflare direttamente.
 * Riproduce il comportamento che il sito aveva su GitHub Pages.
 */

const SICUREZZA = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN'
};

function conIntestazioni(risposta, stato) {
  const h = new Headers(risposta.headers);
  for (const [k, v] of Object.entries(SICUREZZA)) h.set(k, v);
  return new Response(risposta.body, { status: stato || risposta.status, headers: h });
}

async function file(env, url, percorso) {
  return env.ASSETS.fetch(new Request(new URL(percorso, url.origin).toString()));
}

async function esiste(env, url, percorso) {
  const r = await file(env, url, percorso);
  if (r.body) await r.body.cancel();
  return r.status === 200;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    const coda = url.search;

    // Copie doppie caricate per sbaglio (/en/en/, /de/de/): alla pagina giusta
    const doppia = p.match(/^\/(en|de)\/\1(\/.*)?$/);
    if (doppia) return Response.redirect(url.origin + '/' + doppia[1] + '/' + coda, 301);

    if (p.endsWith('/')) {
      // "/", "/en/", "/de/" → il loro index.html
      const r = await file(env, url, p + 'index.html');
      if (r.status === 200) return conIntestazioni(r, 200);
    } else if (!/\.[A-Za-z0-9]+$/.test(p)) {
      // "/en" → "/en/" (come faceva GitHub)
      if (await esiste(env, url, p + '/index.html')) {
        return Response.redirect(url.origin + p + '/' + coda, 301);
      }
      // "/eventi" → "/eventi.html"
      if (await esiste(env, url, p + '.html')) {
        return Response.redirect(url.origin + p + '.html' + coda, 301);
      }
    }

    // Tutto il resto: pagina 404 vera (stato 404, così Google non la indicizza)
    const nf = await file(env, url, '/404.html');
    if (nf.status === 200) return conIntestazioni(nf, 404);
    return new Response('Pagina non trovata', { status: 404 });
  }
};
