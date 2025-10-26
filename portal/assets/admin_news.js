
  import { upsertNews, uploadThumb } from '../assets/news.js';

  let thumbDataURL = ""; // você já preenche isso na prévia

  document.getElementById('btn-publicar')?.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo').value.trim();
    const subtitulo = document.getElementById('subtitulo').value.trim();

    // se estiver usando SunEditor/TinyMCE, pegue o HTML correto
    const corpoHtml = (window.tinymce?.get('editor')?.getContent?.() || '').trim()
                   || (window.editor?.getContents?.(true) || '');

    if (!titulo || !corpoHtml){ alert('Preencha título e corpo.'); return; }

    let thumbURL = thumbDataURL || null;
    if (thumbDataURL) {
      try { thumbURL = await uploadThumb(thumbDataURL, 'thumb.jpg'); } catch {}
    }

    await upsertNews({
      title: titulo,
      subtitle: subtitulo,
      bodyHtml: corpoHtml,
      ts: Date.now(),
      thumb: thumbURL
    });

    alert('Notícia publicada!');
    location.href = './news-list.html';
  });


// auto-bind
bindAdminNews();
