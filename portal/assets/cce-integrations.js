// assets/cce-integrations.js — modal e utilidades
const save = (k,v)=> localStorage.setItem(k, JSON.stringify(v));
const load = (k,f=[])=>{ try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };

export function logReport(key, { title, url }){
  const arr = load(key, []);
  arr.push({ ts: Date.now(), title, url });
  save(key, arr);
}

export function openJustifyModal({ title="Justificativa", details="", onSubmit }){
  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div class="modal-backdrop" style="position:fixed;inset:0;background:#0008;display:flex;align-items:center;justify-content:center;z-index:9999">
    <div class="card" style="width:min(560px, 92vw);max-height:90vh;overflow:auto">
      <h3>${title}</h3>
      <p class="muted" style="margin-top:-4px">${details}</p>
      <textarea id="jst" class="input" rows="6" placeholder="Descreva o motivo…"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button id="jsc" class="btn">Cancelar</button>
        <button id="jss" class="btn btn-primary">Enviar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap.firstElementChild);
  const root = document.body.lastElementChild;
  root.querySelector('#jsc').onclick = ()=> root.remove();
  root.querySelector('#jss').onclick = ()=>{
    const txt = root.querySelector('#jst').value.trim();
    if (!txt) return alert("Escreva a justificativa.");
    try { onSubmit?.(txt); } finally { root.remove(); }
  };
}
