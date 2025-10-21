// assets/news.js — fonte única de notícias (robusta)
const LS_NEWS = "portal_news";

function load(k, f) { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch(_) { return f; } }
function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function uuid() { try { return crypto.randomUUID(); } catch(_) { return Date.now().toString(36) + Math.random().toString(36).slice(2); } }
const esc = (s) => (s ?? "").toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// --- CRUD básico ---
export function listNews() {
  const arr = load(LS_NEWS, []);
  let touched = false;
  for (const n of arr) {
    if (!n.id) { n.id = uuid(); touched = true; }
    if (!n.ts) { n.ts = n.date ? new Date(n.date).getTime() : Date.now(); touched = true; }
    // normalizações leves
    if (typeof n.highlight !== "boolean") { n.highlight = !!n.highlight; touched = true; }
    if (typeof n.title !== "string") n.title = n.title == null ? "" : String(n.title);
    if (typeof n.subtitle !== "string") n.subtitle = n.subtitle == null ? "" : String(n.subtitle);
    if (n.body == null) n.body = "";
  }
  if (touched) save(LS_NEWS, arr);
  return arr.slice().sort((a,b)=> (b.ts||0) - (a.ts||0));
}

export function getNewsById(id) {
  if (!id) return null;
  return listNews().find(n => n.id === id) || null;
}

export function getHighlighted() {
  return listNews().find(n => !!n.highlight) || null;
}

export function setHighlight(id){
  const news = listNews();
  let changed = false;
  news.forEach(n => {
    const should = (n.id === id);
    if (n.highlight !== should){ n.highlight = should; changed = true; }
  });
  if (changed) save(LS_NEWS, news);
  return changed;
}

export function toggleHighlight(id){
  const news = listNews();
  const idx = news.findIndex(n => n.id === id);
  if (idx === -1) return false;
  const willSet = !news[idx].highlight;
  // se for ligar, desliga os demais
  if (willSet) news.forEach(n => { n.highlight = false; });
  news[idx].highlight = willSet;
  save(LS_NEWS, news);
  return true;
}

export function upsertNews(obj) {
  const news = listNews();
  const id = obj.id || uuid();
  const now = Date.now();

  // se veio highlight=true, zera os outros (garante 1 único destaque)
  if (obj.highlight === true) {
    news.forEach(n => { n.highlight = false; });
  }

  const idx = news.findIndex(n => n.id === id);
  if (idx === -1) {
    news.push({
      id,
      title    : (obj.title ?? "").toString(),
      subtitle : (obj.subtitle ?? "").toString(),
      body     : obj.body ?? "",
      highlight: !!obj.highlight,
      ts       : obj.ts || now
    });
  } else {
    const cur = news[idx];
    news[idx] = {
      ...cur,
      ...( 'title'     in obj ? { title: (obj.title ?? "").toString() } : {} ),
      ...( 'subtitle'  in obj ? { subtitle: (obj.subtitle ?? "").toString() } : {} ),
      ...( 'body'      in obj ? { body: obj.body ?? "" } : {} ),
      ...( 'highlight' in obj ? { highlight: !!obj.highlight } : {} ),
      ...( 'ts'        in obj ? { ts: obj.ts || now } : {} ),
    };
  }
  save(LS_NEWS, news);
  return id;
}

export function deleteNews(id) {
  const news = listNews().filter(n => n.id !== id);
  save(LS_NEWS, news);
}

// --- Seed “Bem-vindo” (editável) ---
export function ensureWelcomeSeed() {
  const news = listNews();
  if (!news.length) {
    upsertNews({
      title: "Bem-vindo ao Portal CCE 4.0",
      subtitle: "Central única de notícias",
      body: "Este é um post inicial. Você pode editá-lo na área do Administrador.",
      highlight: true,
      ts: Date.now()
    });
  }
}

// --- Render feed simples (cards) ---
export function renderFeed(selector = "#news-feed") {
  const mount = document.querySelector(selector);
  if (!mount) return;
  const list = listNews();
  if (!list.length) {
    mount.innerHTML = '<p class="muted">Nenhuma atualização por enquanto.</p>';
    return;
  }
  const inPortal = location.pathname.includes('/portal/');
  const linkTo = inPortal ? './news.html' : '/portal/news.html';
  mount.innerHTML = list.map(p => `
    <article class="news-card">
      <div class="news-date">${new Date(p.ts).toLocaleDateString('pt-BR')}</div>
      <h4>${esc(p.title)}</h4>
      ${p.subtitle ? `<p class="news-excerpt">${esc(p.subtitle)}</p>` : ''}
      <a class="news-link" href="${linkTo}?id=${encodeURIComponent(p.id)}">Ler mais</a>
    </article>`).join("");
}

// --- Balão do mascote (destaque) ---
export function initMascotNotifier(){
  const n = getHighlighted();
  const mascot = document.querySelector('#news-mascot') 
              || document.querySelector('.mascote') 
              || document.getElementById('mascote');
  if (!mascot) return;

  let balloon = document.querySelector('.mascot-balloon');
  if (!balloon) {
    balloon = document.createElement('div');
    balloon.className = 'mascot-balloon';
    document.body.appendChild(balloon);
  }

  if (n) {
    const inPortal = location.pathname.includes('/portal/');
    const linkTo = inPortal ? './news.html' : '/portal/news.html';
    const title = esc(n.title);
    const subtitle = esc(n.subtitle || "");
    balloon.innerHTML = `<strong>${title}</strong><br>${subtitle} <br><a class="news-link" href="${linkTo}?id=${encodeURIComponent(n.id)}">Ler agora</a>`;
    balloon.style.display = 'block';
    mascot.style.cursor = 'pointer';
    mascot.onclick = () => location.href = `${linkTo}?id=${encodeURIComponent(n.id)}`;
  } else {
    balloon.style.display = 'none';
    mascot.onclick = null;
  }
}
