// admin_news_publish.js
import { upsertNews, uploadThumb } from '../assets/news.js';

export function bindAdminNews(root = document) {
  const elTitle   = root.getElementById('titulo');
  const elSub     = root.getElementById('subtitulo');
  const btnPub    = root.getElementById('btn-publicar');
  const btnGer    = root.getElementById('btn-gerenciar');

  // ===== Thumbnail (preview + recorte 16:9)
  const inputFile = root.getElementById('thumb-file');
  const imgPrev   = root.getElementById('thumb-img');
  const hint      = root.getElementById('thumb-hint');
  let thumbDataURL = "";

  inputFile?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const src = await fileToDataURL(f);
    thumbDataURL = await makeThumb169(src, 1280, 720);
    if (imgPrev) { imgPrev.src = thumbDataURL; imgPrev.style.display = 'block'; }
    if (hint) hint.style.display = 'none';
  });

  // ===== Publicar
  btnPub?.addEventListener('click', async () => {
    const title = elTitle?.value.trim() || "";
    const subtitle = elSub?.value.trim() || "";
    const bodyHtml = getEditorHtml(root).trim();
    if (!title || !bodyHtml) { alert('Preencha título e corpo.'); return; }

    btnPub.disabled = true;

    let thumbURL = thumbDataURL || null;
    if (thumbDataURL) {
      try { thumbURL = await uploadThumb(thumbDataURL, `thumb_${Date.now()}.jpg`); }
      catch (err) { console.warn('[thumb] upload falhou, usando base64 inline', err); }
    }

    await upsertNews({ title, subtitle, bodyHtml, thumb: thumbURL, ts: Date.now() });
    alert('Notícia publicada!');
    location.href = './news-list.html';
  });

  // ===== Atalho “Gerenciar notícias”
  btnGer?.addEventListener('click', () => {
    location.href = './news-list.html';
  });

  // ===== helpers
  function getEditorHtml(root) {
    if (window.tinymce?.get) {
      const ed = window.tinymce.get('editor');
      if (ed?.getContent) return ed.getContent();
    }
    if (window.editor?.getContents) return window.editor.getContents(true);
    const ta = root.getElementById('editor');
    return ta ? ta.value : "";
  }
  function fileToDataURL(file){
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  async function makeThumb169(src, outW=1280, outH=720){
    const img = new Image(); img.src = src; await img.decode();
    const inW = img.naturalWidth, inH = img.naturalHeight;
    const target = 16/9, inR = inW/inH;
    let sx=0, sy=0, sw=inW, sh=inH;
    if (inR > target){ sw = inH*target; sx = (inW - sw)/2; }
    else if (inR < target){ sh = inW/target; sy = (inH - sh)/2; }
    const cv = document.createElement('canvas'); cv.width = outW; cv.height = outH;
    cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    return cv.toDataURL('image/jpeg', 0.85);
  }
}

bindAdminNews();
