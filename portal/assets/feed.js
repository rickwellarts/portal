const LS_FEED = 'cce_feed';
export function getFeed(){ return JSON.parse(localStorage.getItem(LS_FEED)||"[]"); }
export function setFeed(list){ localStorage.setItem(LS_FEED, JSON.stringify(list)); }
export function renderFeed(){
  const feed = getFeed().sort((a,b)=>new Date(b.dataISO)-new Date(a.dataISO));
  const el = document.getElementById('portalFeed');
  if(!el) return;
  if(feed.length===0){ el.innerHTML = '<p class="muted">Sem atualizações por enquanto.</p>'; return; }
  el.innerHTML = feed.map(item => `
    <article class="feed-item">
      <h3>${item.titulo}</h3>
      <p class="muted">${new Date(item.dataISO).toLocaleString()} — ${item.autor}</p>
      <div class="feed-body">${item.corpo}</div>
    </article>
  `).join('');
}