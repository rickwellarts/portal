// assets/news.js — Firestore only (sem fallback localStorage)
import { firebaseOnce } from './firebase.js';

/* ========= PURGA de legados no localStorage (uma vez por load) ========= */
(() => {
  const KEYS = ['admin_noticias', 'admin_news', 'news_items'];
  try { KEYS.forEach(k => localStorage.removeItem(k)); } catch {}
})();

/* ================= Normalização ================= */
const normPost = (n = {}) => ({
  id:        n.id,
  title:     n.title ?? n.titulo ?? '',
  subtitle:  n.subtitle ?? n.subtitulo ?? '',
  bodyHtml:  n.bodyHtml ?? n.corpoHtml ?? n.body ?? '',
  thumb:     n.thumb ?? n.thumbnail ?? n.cover ?? '',
  ts:        n.ts ?? n.criadoEm ?? Date.now(),
  highlight: !!(n.highlight ?? n.destaque),
  authorUid: n.authorUid ?? null,
});

/* ================= Firestore / Storage helpers ================= */
async function useFS() {
  const { db, storage } = await firebaseOnce();
  const {
    collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc,
    query, where, orderBy, limit, writeBatch
  } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const { ref, uploadString, getDownloadURL } =
    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js');

  async function listNewsFS() {
    const q = query(collection(db, 'news'), orderBy('ts', 'desc'), limit(200));
    const snap = await getDocs(q);
    const arr = [];
    snap.forEach(d => arr.push(normPost({ id: d.id, ...d.data() })));
    return arr;
  }

  async function getNewsByIdFS(id) {
    const d = await getDoc(doc(db, 'news', String(id)));
    return d.exists() ? normPost({ id: d.id, ...d.data() }) : null;
  }

  async function upsertNewsFS(post) {
    const data = { ...post }; delete data.id;
    if (!post.id) {
      const ins = await addDoc(collection(db, 'news'), data);
      return { id: ins.id, ...post };
    } else {
      await setDoc(doc(db, 'news', String(post.id)), data, { merge: true });
      return post;
    }
  }

  async function deleteNewsFS(id) {
    await deleteDoc(doc(db, 'news', String(id)));
  }

  async function uploadThumbFS(base64, name = 'thumb.jpg') {
    if (!base64) return null;
    const safe = name.replace(/\s+/g, '_');
    const path = `news/thumbs/${Date.now()}-${safe}`;
    const r = ref(storage, path);
    await uploadString(r, base64, 'data_url');
    return await getDownloadURL(r);
  }

  // garante APENAS um destacado
  async function setHighlightFS(id, on = true) {
    const batch = writeBatch(db);
    if (on) {
      const qHi = query(collection(db, 'news'), where('highlight', '==', true), limit(50));
      const snap = await getDocs(qHi);
      snap.forEach(d => {
        if (d.id !== id) batch.set(doc(db, 'news', d.id), { highlight: false }, { merge: true });
      });
    }
    batch.set(doc(db, 'news', String(id)), { highlight: !!on }, { merge: true });
    await batch.commit();
  }

  return {
    listNewsFS, getNewsByIdFS, upsertNewsFS, deleteNewsFS, uploadThumbFS, setHighlightFS
  };
}

/* ================= API pública (Firestore only) ================= */
export async function listNews() {
  const { listNewsFS } = await useFS();
  return await listNewsFS();
}
export async function getNewsById(id) {
  const { getNewsByIdFS } = await useFS();
  return await getNewsByIdFS(id);
}
export async function upsertNews(post) {
  const { upsertNewsFS } = await useFS();
  return await upsertNewsFS(normPost(post));
}
export async function deleteNews(id) {
  const { deleteNewsFS } = await useFS();
  return await deleteNewsFS(id);
}
export async function uploadThumb(base64, name) {
  const { uploadThumbFS } = await useFS();
  return await uploadThumbFS(base64, name);
}
export async function setHighlight(id, on = true) {
  const { setHighlightFS } = await useFS();
  return await setHighlightFS(id, on);
}

/* ================= Feed ================= */
export async function renderFeed(mountSelector = '#news-feed') {
  const host = (typeof mountSelector === 'string')
    ? document.querySelector(mountSelector)
    : mountSelector;
  if (!host) return;

  const items = await listNews();
  if (!items.length) {
    host.innerHTML = `<p class="muted">Nenhuma atualização publicada ainda.</p>`;
    return;
  }

  const list = items.map(normPost);
  const hi = list.filter(n => n.highlight).sort((a,b)=> (b.ts||0)-(a.ts||0));
  const lo = list.filter(n => !n.highlight).sort((a,b)=> (b.ts||0)-(a.ts||0));
  const ordered = [...hi, ...lo];

  host.innerHTML = `
    <div class="feed-grid">
      ${ordered.map(p => `
        <article class="feed-card">
          ${p.thumb ? `<img class="feed-thumb" src="${p.thumb}" alt="">` : ``}
          <div class="feed-body">
            <div class="feed-title">
              ${p.title || '(sem título)'}${p.highlight ? ` <span title="Destaque" style="color:gold">★</span>` : ``}
            </div>
            ${p.subtitle ? `<div class="feed-sub">${p.subtitle}</div>` : ``}
            <div class="feed-meta">${new Date(p.ts).toLocaleDateString('pt-BR')}</div>
            <div class="feed-actions">
              <a class="btn" href="/portal/news.html?id=${encodeURIComponent(p.id)}">Ler mais</a>
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

/* ================= Seed (opcional) ================= */
export async function ensureWelcomeSeed() {
  const cur = await listNews();
  if (cur.length) return;
  await upsertNews({
    title: 'Bem-vindo ao Portal CCE 4.0',
    subtitle: 'Central única de notícias',
    bodyHtml: '<p>Primeira notícia do sistema.</p>',
    ts: Date.now(),
    highlight: true
  });
}

/* ================= Balão do mascote ================= */
export async function initMascotNotifier() {
  const mascot = document.getElementById('news-mascot');
  const badge  = document.getElementById('news-badge');
  if (!mascot || !badge) return;

  // Classe que seu CSS já estiliza
  badge.classList.add('mascot-balloon');

  const items = await listNews();
  if (!items || !items.length) { badge.style.display = 'none'; return; }

  const list = items.map(normPost).sort((a,b)=> (b.ts||0)-(a.ts||0));
  const top  = list.find(n => n.highlight) || list[0];

  const href = `/portal/news.html?id=${encodeURIComponent(top.id)}`;
  badge.innerHTML = `
    <a class="news-link" href="${href}">
      <strong>${top.title || 'Atualização'}</strong>
      ${top.subtitle ? `<div>${top.subtitle}</div>` : ''}
      <small>Ler agora</small>
    </a>
  `;
  badge.style.display = 'block';
}
