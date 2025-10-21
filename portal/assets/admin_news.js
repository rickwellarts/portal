// assets/admin_news.js
import { listNews, upsertNews } from './news.js';

export function bindAdminNews(doc = document){
  const f = doc.getElementById('news-form');
  if (!f) return;

  const title = doc.getElementById('news-title');
  const subtitle = doc.getElementById('news-subtitle');
  const highlight = doc.getElementById('news-highlight');
  const tCount = doc.getElementById('title-count');
  const sCount = doc.getElementById('subtitle-count');

  const setCount = () => {
    if (tCount) tCount.textContent = String(title.value.length);
    if (sCount) sCount.textContent = String(subtitle.value.length);
  };
  ['input','change','keyup'].forEach(ev=>{
    title.addEventListener(ev,setCount);
    subtitle.addEventListener(ev,setCount);
  });
  setCount();

  f.addEventListener('submit', (e)=>{
    e.preventDefault();
    const _title = title.value.trim();
    const _subtitle = subtitle.value.trim();
    const _body = (window.getEditorHtml ? window.getEditorHtml() : '').trim();
    const _highlight = !!highlight.checked;

    if (!_title && !_body){
      alert('Preencha pelo menos o Título ou o Corpo.'); 
      return;
    }

    // se marcar destaque, remove dos demais
    if (_highlight){
      const items = listNews();
      items.forEach(n => { if (n.highlight) upsertNews({ id:n.id, highlight:false }); });
    }

    // cria/atualiza
    upsertNews({
      id: crypto.randomUUID(),
      title: _title,
      subtitle: _subtitle,
      body: _body,
      highlight: _highlight,
      ts: Date.now()
    });

    // limpa formulário
    f.reset();
    if (window.resetEditor) window.resetEditor();
    setCount();
    alert('Notícia publicada!');
  });
}

// auto-bind
bindAdminNews();
