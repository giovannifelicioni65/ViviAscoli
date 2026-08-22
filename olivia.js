/* ==========================================================================
   Olivia — assistente virtuale del Rifugio Collina del Sacro Cuore
   viviascoli.com · agosto 2026

   Come si usa: una riga in fondo alla pagina, prima di </body>
       <script src="/olivia.js" defer></script>

   Non richiede librerie. Non carica nulla da server esterni.
   Tutto lo stile è isolato dentro un shadow DOM: non può rompere il sito.
   ========================================================================== */
(function () {
  'use strict';

  /* --- Dove Olivia può apparire ------------------------------------------
     Solo sulle tre pagine di ingresso: italiano, inglese, tedesco.
     Se il file finisse per errore su "eventi", "attività" o "dove si mangia",
     questo controllo lo spegne da solo senza rompere nulla.               */
  var AMMESSE = ['/', '/index.html', '/en/', '/en/index.html', '/de/', '/de/index.html'];
  var qui = location.pathname.replace(/\/{2,}/g, '/');
  var anteprima = location.protocol === 'file:' || /anteprima\.html$/.test(qui);
  if (!anteprima && AMMESSE.indexOf(qui) === -1) return;

  /* --- Configurazione ---------------------------------------------------- */
  var CONFIG = {
    // Indirizzo del Worker Cloudflare — il cervello di Olivia.
    // Se un giorno lo svuoti (endpoint: ''), Olivia torna in modalità
    // dimostrativa con risposte finte, senza rompere il sito.
    endpoint: 'https://olivia.giovannifelicioni65.workers.dev/',

    whatsapp: 'https://wa.me/393514717198',
    calendario: 'https://beds24.com/booking.php?propid=334499&lang=it',
    email: 'info@viviascoli.com'
  };

  /* --- Testi, per lingua -------------------------------------------------- */
  var T = {
    it: {
      titolo: 'Olivia',
      sottotitolo: 'assistente virtuale',
      apri: 'Chiedi a Olivia',
      chiudi: 'Chiudi la conversazione',
      benvenuto: 'Ciao, sono Olivia — come l’oliva all’ascolana. ' +
                 'Sono l’assistente virtuale del Rifugio: posso raccontarti ' +
                 'dove siamo, cosa vedere ad Ascoli e dove si mangia bene. ' +
                 'Da cosa partiamo?',
      chips: ['Dove si trova il rifugio?', 'Quanto dista il centro?',
              'Dove andiamo a mangiare?', 'Siamo qui 3 giorni, che giro ci consigli?',
              'Che tempo farà?'],
      saluto: 'Ciao, sono Olivia! Se hai una domanda su Ascoli o sul Rifugio, sono qui.',
      placeholder: 'Scrivi qui la tua domanda…',
      invia: 'Invia',
      calendario: 'Vedi le date e le tariffe',
      whatsapp: 'Scrivi su WhatsApp',
      errore: 'Scusa, in questo momento non riesco a risponderti. ' +
              'Giovanni e Daniela però ci sono sempre:',
      scrivendo: 'Olivia sta scrivendo',
      nota: 'Olivia è un assistente virtuale. Per prezzi e conferme, ' +
            'il calendario e WhatsApp.',
      demo: 'Modalità dimostrativa — risposte di esempio'
    },
    en: {
      titolo: 'Olivia',
      sottotitolo: 'virtual assistant',
      apri: 'Ask Olivia',
      chiudi: 'Close the chat',
      benvenuto: 'Hi, I’m Olivia — named after the Ascoli olive. ' +
                 'I’m the virtual assistant of the Rifugio: I can tell you ' +
                 'where we are, what to see in Ascoli and where to eat well. ' +
                 'Where shall we start?',
      chips: ['Where is the apartment?', 'How far is the old town?',
              'Where should we eat?', 'We have 3 days — what do you suggest?',
              'What’s the weather like?'],
      saluto: 'Hi, I\'m Olivia! Any question about Ascoli or the Rifugio — I\'m here.',
      placeholder: 'Type your question…',
      invia: 'Send',
      calendario: 'See dates and rates',
      whatsapp: 'Message us on WhatsApp',
      errore: 'Sorry, I can’t answer right now. ' +
              'Giovanni and Daniela are always here though:',
      scrivendo: 'Olivia is typing',
      nota: 'Olivia is a virtual assistant. For prices and bookings, ' +
            'use the calendar or WhatsApp.',
      demo: 'Demo mode — sample answers'
    },
    de: {
      titolo: 'Olivia',
      sottotitolo: 'virtuelle Assistentin',
      apri: 'Olivia fragen',
      chiudi: 'Chat schließen',
      benvenuto: 'Hallo, ich bin Olivia — benannt nach der Olive aus Ascoli. ' +
                 'Ich bin die virtuelle Assistentin des Rifugio: Ich erzähle ' +
                 'Ihnen, wo wir sind, was Sie in Ascoli sehen und wo Sie gut ' +
                 'essen können. Womit fangen wir an?',
      chips: ['Wo liegt die Wohnung?', 'Wie weit ist die Altstadt?',
              'Wo sollen wir essen?', 'Wir bleiben 3 Tage — was empfehlen Sie?',
              'Wie wird das Wetter?'],
      saluto: 'Hallo, ich bin Olivia! Fragen zu Ascoli oder zum Rifugio? Ich bin da.',
      placeholder: 'Ihre Frage…',
      invia: 'Senden',
      calendario: 'Termine und Preise ansehen',
      whatsapp: 'Auf WhatsApp schreiben',
      errore: 'Entschuldigung, ich kann gerade nicht antworten. ' +
              'Giovanni und Daniela sind aber immer da:',
      scrivendo: 'Olivia schreibt',
      nota: 'Olivia ist eine virtuelle Assistentin. Für Preise und ' +
            'Buchungen bitte den Kalender oder WhatsApp nutzen.',
      demo: 'Demomodus — Beispielantworten'
    }
  };

  /* Lingua: dal <html lang> o dal percorso /en/ /de/ */
  function lingua() {
    var p = location.pathname;
    if (p.indexOf('/en/') === 0 || p.indexOf('/en/') > -1) return 'en';
    if (p.indexOf('/de/') === 0 || p.indexOf('/de/') > -1) return 'de';
    var l = (document.documentElement.lang || 'it').slice(0, 2).toLowerCase();
    return T[l] ? l : 'it';
  }
  var L = lingua();
  var t = T[L];

  /* --- Stile (isolato nello shadow DOM) ---------------------------------- */
  var CSS = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:host {
  --travertino:#F3EADB; --crema:#EADDC8; --inchiostro:#2A241E;
  --terracotta:#B0512F; --ambra:#C98A45; --oliva:#5F6B43; --oliva-scuro:#414B2D;
  --soft:#7C6F5E; --bianco:#FFFDF9;
  --ombra: 0 18px 48px rgba(42,36,30,.22), 0 4px 12px rgba(42,36,30,.10);
  --corpo: "Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --titoli: "Fraunces", Georgia, serif;
}

/* ---- La bolla ---- */
.bolla {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
  display: flex; align-items: center; gap: 10px;
  height: 58px; padding: 0 22px 0 14px;
  border: none; border-radius: 999px; cursor: pointer;
  background: var(--oliva); color: var(--travertino);
  font-family: var(--corpo); font-size: 15.5px; font-weight: 600; letter-spacing: .01em;
  box-shadow: var(--ombra);
  transition: transform .22s cubic-bezier(.34,1.4,.64,1), background .25s;
}
.bolla:hover { background: var(--oliva-scuro); transform: translateY(-2px); }
.bolla:focus-visible { outline: 3px solid var(--ambra); outline-offset: 3px; }
.bolla.via { transform: scale(.7); opacity: 0; pointer-events: none; }
/* scompare quando si arriva al footer, per non coprirlo */
.bolla.alfooter { transform: translateY(20px) scale(.85); opacity: 0; pointer-events: none; }
.bolla svg { width: 32px; height: 32px; flex: none; }

/* pallino che richiama l'attenzione la prima volta */
.punto {
  position: absolute; top: 10px; right: 14px;
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--terracotta); box-shadow: 0 0 0 2px var(--oliva);
}

/* ---- Il saluto che compare accanto alla bolla ---- */
.saluto {
  position: fixed; right: 20px; bottom: 90px; z-index: 2147482999;
  max-width: 268px; padding: 14px 38px 14px 16px;
  background: var(--bianco); color: var(--inchiostro);
  border: 1px solid rgba(42,36,30,.11); border-radius: 16px 16px 5px 16px;
  box-shadow: var(--ombra);
  font-family: var(--corpo); font-size: 14.5px; line-height: 1.5;
  cursor: pointer; text-align: left;
  opacity: 0; transform: translateY(10px) scale(.96); pointer-events: none;
  transition: opacity .35s ease, transform .35s cubic-bezier(.34,1.3,.64,1);
}
.saluto.mostra { opacity: 1; transform: none; pointer-events: auto; }
.saluto .chiudi-saluto {
  position: absolute; top: 6px; right: 6px;
  width: 24px; height: 24px; border: none; border-radius: 8px;
  background: transparent; color: var(--soft); font-size: 15px; line-height: 1;
  cursor: pointer;
}
.saluto .chiudi-saluto:hover { background: var(--crema); color: var(--inchiostro); }
.saluto .chiudi-saluto:focus-visible { outline: 2px solid var(--oliva); outline-offset: 1px; }

/* ---- Il pannello ---- */
.pannello {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483001;
  width: 396px; max-width: calc(100vw - 40px);
  height: 620px; max-height: calc(100vh - 40px);
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--travertino); border-radius: 20px;
  box-shadow: var(--ombra);
  font-family: var(--corpo); color: var(--inchiostro);
  opacity: 0; transform: translateY(14px) scale(.97); pointer-events: none;
  transition: opacity .24s ease, transform .24s cubic-bezier(.34,1.2,.64,1);
}
.pannello.aperto { opacity: 1; transform: none; pointer-events: auto; }

.testa {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 16px 15px 18px; background: var(--oliva); color: var(--travertino);
  flex: none;
}
.testa svg { width: 38px; height: 38px; flex: none; }
.testa .nome { font-family: var(--titoli); font-size: 20px; font-weight: 500; line-height: 1.1; }
.testa .ruolo { font-size: 12px; opacity: .82; letter-spacing: .04em; margin-top: 2px; }
.testa .x {
  margin-left: auto; width: 34px; height: 34px; flex: none;
  background: rgba(243,234,219,.14); border: none; border-radius: 10px;
  color: var(--travertino); font-size: 20px; line-height: 1; cursor: pointer;
  transition: background .2s;
}
.testa .x:hover { background: rgba(243,234,219,.28); }
.testa .x:focus-visible { outline: 2px solid var(--travertino); outline-offset: 2px; }

.demo {
  flex: none; background: var(--ambra); color: #3a2a14;
  font-size: 11.5px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase;
  padding: 6px 18px; text-align: center;
}

.corpo { flex: 1 1 auto; overflow-y: auto; padding: 18px; scroll-behavior: smooth; }
.corpo::-webkit-scrollbar { width: 8px; }
.corpo::-webkit-scrollbar-thumb { background: rgba(124,111,94,.34); border-radius: 4px; }

.riga { display: flex; margin-bottom: 12px; }
.riga.mia { justify-content: flex-end; }

.bolla-msg {
  max-width: 84%; padding: 11px 15px; border-radius: 16px;
  font-size: 15px; line-height: 1.58; white-space: pre-wrap; overflow-wrap: anywhere;
}
.riga.sua .bolla-msg {
  background: var(--bianco); border: 1px solid rgba(42,36,30,.09);
  border-bottom-left-radius: 5px;
}
.riga.mia .bolla-msg {
  background: var(--oliva); color: var(--travertino); border-bottom-right-radius: 5px;
}
.bolla-msg strong { font-weight: 650; }
.bolla-msg a { color: var(--terracotta); text-decoration: underline; text-underline-offset: 2px; }

/* puntini "sta scrivendo" */
.punti { display: flex; gap: 5px; padding: 4px 2px; }
.punti i {
  width: 7px; height: 7px; border-radius: 50%; background: var(--soft);
  animation: salta 1.25s infinite ease-in-out;
}
.punti i:nth-child(2) { animation-delay: .16s; }
.punti i:nth-child(3) { animation-delay: .32s; }
@keyframes salta { 0%,72%,100% { opacity:.3; transform: translateY(0);} 36% { opacity:1; transform: translateY(-5px);} }

/* pulsanti di azione dentro una risposta */
.azioni { display: flex; flex-wrap: wrap; gap: 8px; margin: 2px 0 14px 0; }
.azione {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 16px; border-radius: 999px; border: none; cursor: pointer;
  font-family: var(--corpo); font-size: 14px; font-weight: 600;
  text-decoration: none; transition: transform .18s, filter .18s;
}
.azione:hover { transform: translateY(-1px); filter: brightness(1.06); }
.azione.primaria { background: var(--terracotta); color: var(--travertino); }
.azione.seconda  { background: var(--crema); color: var(--inchiostro); border: 1px solid rgba(42,36,30,.14); }

/* domande suggerite */
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.chip {
  padding: 9px 14px; border-radius: 999px; cursor: pointer;
  background: var(--crema); border: 1px solid rgba(42,36,30,.13);
  font-family: var(--corpo); font-size: 13.5px; color: var(--inchiostro);
  text-align: left; transition: background .2s, transform .18s;
}
.chip:hover { background: var(--bianco); transform: translateY(-1px); }
.chip:focus-visible { outline: 2px solid var(--oliva); outline-offset: 2px; }

/* ---- Piede ---- */
.piede { flex: none; border-top: 1px solid rgba(42,36,30,.10); background: var(--travertino); }
.campo { display: flex; align-items: flex-end; gap: 9px; padding: 12px 12px 8px; }
.campo textarea {
  flex: 1; resize: none; max-height: 108px; min-height: 44px;
  padding: 11px 14px; border-radius: 14px;
  border: 1px solid rgba(42,36,30,.16); background: var(--bianco);
  font-family: var(--corpo); font-size: 15px; line-height: 1.45; color: var(--inchiostro);
}
.campo textarea:focus { outline: none; border-color: var(--oliva); }
.campo textarea::placeholder { color: var(--soft); }
.invia {
  flex: none; width: 44px; height: 44px; border: none; border-radius: 13px; cursor: pointer;
  background: var(--terracotta); color: var(--travertino);
  display: flex; align-items: center; justify-content: center;
  transition: filter .2s, transform .18s;
}
.invia:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
.invia:disabled { opacity: .38; cursor: default; }
.invia svg { width: 19px; height: 19px; }
.nota { padding: 0 16px 11px; font-size: 11.5px; line-height: 1.45; color: var(--soft); text-align: center; }

/* ---- Telefono ---- */
@media (max-width: 520px) {
  .pannello {
    right: 0; bottom: 0; width: 100vw; max-width: 100vw;
    height: 100dvh; max-height: 100dvh; border-radius: 0;
  }
  .bolla { right: 14px; bottom: 14px; height: 54px; padding: 0 18px 0 12px; font-size: 15px; }
}

@media (prefers-reduced-motion: reduce) {
  .bolla, .pannello, .azione, .chip, .invia { transition: none; }
  .punti i { animation: none; opacity: .55; }
}
`;

  /* --- L'oliva (icona) ---------------------------------------------------- */
  function oliva(dim) {
    return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
      '<ellipse cx="20" cy="21" rx="12.4" ry="14.4" fill="#C98A45"/>' +
      '<ellipse cx="20" cy="21" rx="12.4" ry="14.4" fill="none" stroke="#A96F31" stroke-width="1.1"/>' +
      '<ellipse cx="15.8" cy="15.4" rx="3.5" ry="4.4" fill="#E0AC6D" opacity=".72"/>' +
      '<circle cx="24.6" cy="26.4" r="1.05" fill="#A96F31" opacity=".55"/>' +
      '<circle cx="16.2" cy="27.8" r=".85" fill="#A96F31" opacity=".45"/>' +
      '<circle cx="23.2" cy="14.6" r=".8" fill="#A96F31" opacity=".4"/>' +
      '<path d="M20 7.2c0-2.4 1.6-4.1 4-4.5-.2 2.6-1.6 4.1-4 4.5z" fill="#5F6B43"/>' +
      '<path d="M20 7.4V4.6" stroke="#414B2D" stroke-width="1.3" stroke-linecap="round"/>' +
      '</svg>';
  }

  /* --- Avvio ritardato -----------------------------------------------------
     Olivia si costruisce solo DOPO che la pagina ha finito di caricare.
     Così non toglie né banda né millisecondi al primo disegno della schermata:
     l'effetto sulla velocità misurata è nullo, non "piccolo".
     Non usa cookie, non usa localStorage, non lascia niente sul dispositivo. */
  if (document.readyState === 'complete') setTimeout(avvia, 300);
  else window.addEventListener('load', function () { setTimeout(avvia, 300); });

  /* --- Costruzione dell'interfaccia --------------------------------------- */
  function avvia() {

  var host = document.createElement('div');
  host.setAttribute('data-olivia', '');
  document.body.appendChild(host);
  var sh = host.attachShadow({ mode: 'open' });

  var stile = document.createElement('style');
  stile.textContent = CSS;
  sh.appendChild(stile);

  var demo = !CONFIG.endpoint;

  var wrap = document.createElement('div');
  wrap.innerHTML =
    '<div class="saluto" role="button" tabindex="0">' + esc(t.saluto) +
      '<button class="chiudi-saluto" type="button" aria-label="' + t.chiudi + '">&#10005;</button>' +
    '</div>' +
    '<button class="bolla" type="button" aria-label="' + t.apri + '">' +
      oliva() + '<span>' + t.apri + '</span><span class="punto"></span>' +
    '</button>' +
    '<div class="pannello" role="dialog" aria-modal="false" aria-label="' + t.titolo + ', ' + t.sottotitolo + '">' +
      '<div class="testa">' + oliva() +
        '<div><div class="nome">' + t.titolo + '</div>' +
        '<div class="ruolo">' + t.sottotitolo + '</div></div>' +
        '<button class="x" type="button" aria-label="' + t.chiudi + '">&#10005;</button>' +
      '</div>' +
      (demo ? '<div class="demo">' + t.demo + '</div>' : '') +
      '<div class="corpo" role="log" aria-live="polite"></div>' +
      '<div class="piede">' +
        '<div class="campo">' +
          '<textarea rows="1" placeholder="' + t.placeholder + '" aria-label="' + t.placeholder + '"></textarea>' +
          '<button class="invia" type="button" aria-label="' + t.invia + '" disabled>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="nota">' + t.nota + '</div>' +
      '</div>' +
    '</div>';
  sh.appendChild(wrap);

  var bolla    = sh.querySelector('.bolla');
  var punto    = sh.querySelector('.punto');
  var pannello = sh.querySelector('.pannello');
  var corpo    = sh.querySelector('.corpo');
  var testo    = sh.querySelector('textarea');
  var btnInvia = sh.querySelector('.invia');
  var btnX     = sh.querySelector('.x');

  /* --- Utilità ------------------------------------------------------------ */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }
  /* Solo **grassetto** e a capo: nessun HTML arbitrario dal server */
  function formatta(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  function giu() { corpo.scrollTop = corpo.scrollHeight; }

  function messaggio(chi, txt) {
    var r = document.createElement('div');
    r.className = 'riga ' + (chi === 'io' ? 'mia' : 'sua');
    r.innerHTML = '<div class="bolla-msg">' + formatta(txt) + '</div>';
    corpo.appendChild(r);
    giu();
    return r;
  }

  function azioni(lista) {
    var d = document.createElement('div');
    d.className = 'azioni';
    lista.forEach(function (a) {
      var el = document.createElement('a');
      el.className = 'azione ' + (a.tipo || 'seconda');
      el.href = a.href; el.target = '_blank'; el.rel = 'noopener';
      el.textContent = a.testo;
      d.appendChild(el);
    });
    corpo.appendChild(d);
    giu();
  }

  function suggerimenti() {
    var d = document.createElement('div');
    d.className = 'chips';
    t.chips.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'chip'; b.type = 'button'; b.textContent = c;
      b.addEventListener('click', function () { d.remove(); manda(c); });
      d.appendChild(b);
    });
    corpo.appendChild(d);
    giu();
  }

  function scrivendo() {
    var r = document.createElement('div');
    r.className = 'riga sua';
    r.innerHTML = '<div class="bolla-msg" aria-label="' + t.scrivendo + '">' +
                  '<span class="punti"><i></i><i></i><i></i></span></div>';
    corpo.appendChild(r); giu();
    return r;
  }

  /* --- Apertura e chiusura ------------------------------------------------ */
  var avviata = false;
  function apri() {
    nascondiSaluto();
    pannello.classList.add('aperto');
    bolla.classList.add('via');
    if (punto) punto.remove();
    if (!avviata) {
      avviata = true;
      messaggio('lei', t.benvenuto);
      suggerimenti();
    }
    setTimeout(function () { testo.focus(); }, 260);
  }
  function chiudi() {
    pannello.classList.remove('aperto');
    bolla.classList.remove('via');
    bolla.focus();
  }
  bolla.addEventListener('click', apri);
  btnX.addEventListener('click', chiudi);

  /* --- Il saluto -----------------------------------------------------------
     Compare accanto alla bolla dopo qualche secondo, una sola volta per
     visita. Si può chiudere, e cliccandolo apre la conversazione.
     Sparisce da solo dopo un po': è un invito, non un ostacolo.            */
  var saluto = sh.querySelector('.saluto');
  var btnSaluto = sh.querySelector('.chiudi-saluto');
  var timerSaluto;

  function nascondiSaluto() {
    clearTimeout(timerSaluto);
    if (saluto) saluto.classList.remove('mostra');
  }
  function mostraSaluto() {
    if (!saluto || pannello.classList.contains('aperto')) return;
    if (bolla.classList.contains('alfooter')) return;   /* non sul footer */
    saluto.classList.add('mostra');
    timerSaluto = setTimeout(nascondiSaluto, 14000);    /* via dopo 14 s */
  }
  if (saluto) {
    saluto.addEventListener('click', function (e) {
      if (e.target === btnSaluto) return;
      nascondiSaluto(); apri();
    });
    saluto.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nascondiSaluto(); apri(); }
    });
    btnSaluto.addEventListener('click', function (e) {
      e.stopPropagation(); nascondiSaluto();
    });
    timerSaluto = setTimeout(mostraSaluto, 4500);
  }

  /* La bolla si ritira quando compare il footer, così non lo copre.
     Se la conversazione è aperta non succede nulla: resta aperta. */
  var piedePagina = document.querySelector('footer') ||
                    document.querySelector('.contatti');
  if (piedePagina) {
    var ultimo = 0;
    var guarda = function () {
      var y = piedePagina.getBoundingClientRect().top;
      /* si ritira appena il footer sale sopra il livello della bolla */
      var giu = y <= window.innerHeight - 60;
      bolla.classList.toggle('alfooter', giu);
      if (giu) nascondiSaluto();
    };
    var suScroll = function () {
      var ora = Date.now();
      if (ora - ultimo < 80) return;   /* al massimo ogni 80 ms */
      ultimo = ora;
      guarda();
    };
    window.addEventListener('scroll', suScroll, { passive: true });
    window.addEventListener('resize', suScroll, { passive: true });
    guarda();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pannello.classList.contains('aperto')) chiudi();
  });

  /* --- Campo di scrittura -------------------------------------------------- */
  function misura() {
    testo.style.height = 'auto';
    testo.style.height = Math.min(testo.scrollHeight, 108) + 'px';
    btnInvia.disabled = !testo.value.trim() || occupata;
  }
  testo.addEventListener('input', misura);
  testo.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inviaOra(); }
  });
  btnInvia.addEventListener('click', inviaOra);
  function inviaOra() {
    var v = testo.value.trim();
    if (!v || occupata) return;
    testo.value = ''; misura();
    manda(v);
  }

  /* --- Conversazione ------------------------------------------------------- */
  var storia = [];
  var occupata = false;

  function manda(domanda) {
    messaggio('io', domanda);
    storia.push({ role: 'user', content: domanda });
    occupata = true; btnInvia.disabled = true;
    var attesa = scrivendo();

    rispondi(domanda).then(function (r) {
      attesa.remove();
      messaggio('lei', r.testo);
      if (r.azioni && r.azioni.length) azioni(r.azioni);
      storia.push({ role: 'assistant', content: r.testo });
      if (r.chiudi) { testo.disabled = true; btnInvia.disabled = true; return; }
      occupata = false; misura();
    }).catch(function () {
      attesa.remove();
      messaggio('lei', t.errore);
      azioni([{ testo: t.whatsapp, href: CONFIG.whatsapp, tipo: 'primaria' }]);
      occupata = false; misura();
    });
  }

  /* --- Il collegamento al Worker ------------------------------------------- */
  function rispondi(domanda) {
    if (demo) return finta(domanda);
    return fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaggi: storia, lingua: L })
    }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    });
  }

  /* --- Modalità dimostrativa (sparisce quando c'è il Worker) --------------- */
  function finta(d) {
    var q = d.toLowerCase();
    var r;
    if (/dove|trova|posizione|situat|liegt|where/.test(q)) {
      r = { testo: 'Siamo in **Via Monte Ascensione 9**, sulla collina del Sacro Cuore, ' +
                   'all’ingresso nord di Ascoli. Dalla terrazza si vedono i tetti del ' +
                   'centro storico, e si parcheggia liberamente lungo la via — siamo ' +
                   'fuori dalla ZTL, quindi l’auto resta ferma per tutto il soggiorno.' };
    } else if (/dista|quanto|centro|piedi|far|weit/.test(q)) {
      r = { testo: 'Dieci-quindici minuti a piedi. Si scende al borgo di **Solestà**, ' +
                   'si attraversa il **Ponte Romano** — duemila anni, una sola arcata — ' +
                   'e si è tra le piazze di travertino.\n\nAl ritorno c’è una leggera ' +
                   'salita: è il prezzo del panorama, e del silenzio.' };
    } else if (/mangia|cena|ristorant|eat|essen/.test(q)) {
      r = { testo: 'Dipende dalla serata che avete in mente. Ad Ascoli si mangia bene ' +
                   'quasi ovunque, ma il piatto da provare è uno solo: **l’oliva ' +
                   'all’ascolana DOP** — quella da cui prendo il nome.\n\nSul sito ' +
                   'trovate la nostra guida con 78 locali scelti, divisi per tipo.' };
    } else if (/giorn|itinerar|consigl|suggest|tag/.test(q)) {
      r = { testo: 'Tre giorni sono la misura giusta. Farei così:\n\n' +
                   '**Giorno 1** — Ponte Romano, Piazza del Popolo, le Rue. ' +
                   'Pranzo con le olive ascolane, poi la Pinacoteca. Anisetta al Caffè ' +
                   'Meletti e tramonto dalla terrazza.\n\n' +
                   '**Giorno 2** — Forte Malatesta e la Cartiera Papale la mattina; ' +
                   'nel pomeriggio la salita a Colle San Marco tra i castagni, fino ' +
                   'all’Eremo incastonato nella roccia.\n\n' +
                   '**Giorno 3** — fuori città: i borghi del Piceno con Offida in ' +
                   'testa, oppure i Sibillini, oppure il mare.' };
    } else if (/tempo|meteo|weather|wetter|pioggia|sole/.test(q)) {
      r = { testo: 'In modalità dimostrativa non vedo le previsioni vere. ' +
                   'Quando sarò collegata le leggo in tempo reale e vi dico anche ' +
                   'se conviene spostare la giornata all’aperto.' };
    } else {
      r = { testo: 'Questa è una prova: sto rispondendo con frasi già scritte. ' +
                   'Quando sarò collegata risponderò davvero, basandomi solo su ' +
                   'quello che Giovanni e Daniela mi hanno raccontato del Rifugio e di Ascoli.' };
    }
    r.azioni = [
      { testo: t.calendario, href: CONFIG.calendario, tipo: 'primaria' },
      { testo: t.whatsapp,   href: CONFIG.whatsapp,   tipo: 'seconda' }
    ];
    return new Promise(function (ok) { setTimeout(function () { ok(r); }, 700); });
  }

  } /* fine di avvia() */
})();
