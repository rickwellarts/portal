/* ===== ADMIN: lista de justificativas finalizadas ===== */
const JUSTIF_FIN_KEY = "extrap_justif_finalizadas";

// util formatar data
function fmtData(ts){
  try {
    const d = new Date(ts);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch { return "—"; }
}

// abre detalhes no modal padrão do portal
function openJustifDetails(j){
  const html = `
    <div style="display:grid; gap:6px;">
      <div><strong>Prefixo:</strong> ${j.prefixo || "—"}</div>
      <div><strong>Maquinista:</strong> ${j.maquinista || "—"}</div>

      <div><strong>Registrado por:</strong> <span style="color:${j.registradoPor ? '#ff0' : '#888'}">${
  j.registradoPor 
  || JSON.parse(localStorage.getItem('auth_user') || localStorage.getItem('user') || '{}')?.name 
  || localStorage.getItem('username') 
  || '—'
}</span></div>

      <div><strong>Registrado em:</strong> ${fmtData(j.fechadoEm)}</div>
      <hr style="border-color:rgba(255,255,255,.12);">
      <div><strong>Justificativa</strong></div>
      <div style="white-space:pre-wrap;">${(j.motivo || "—")
        .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
    </div>
  `;
  openModal({
    title: "Detalhes da justificativa",
    message: html,
    showCancel: false,
    okText: "Fechar"
  });
}

// renderiza a lista; target pode ser seletor (ex: "#admin-justifs") ou elemento
function renderAdminJustifs(target){
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;

  let list = [];
  try { list = JSON.parse(localStorage.getItem(JUSTIF_FIN_KEY) || "[]"); } catch {}

  el.innerHTML = ""; // limpa
  if (!list.length){
    el.innerHTML = `<p class="muted">Nenhuma justificativa registrada ainda.</p>`;
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "list-flat";
  list.slice().reverse().forEach(j => {
    const li = document.createElement("li");
    // título sem “0 min”
    const btn = document.createElement("button");
    btn.className = "btn btn-xs";
    btn.style.marginLeft = "8px";
    btn.textContent = "Ver detalhes";

    li.innerHTML = `<strong>${j.prefixo || "—"} — ${j.maquinista || "—"}</strong>`;
    li.appendChild(btn);

    btn.addEventListener("click", () => openJustifDetails(j));
    ul.appendChild(li);
  });

  el.appendChild(ul);
}

// opcional: auto-render ao abrir tela admin
window.addEventListener("DOMContentLoaded", () => {
  const mount = document.querySelector("#admin-justifs");
  if (mount) renderAdminJustifs(mount);
});

// exporta para você chamar manualmente se preferir
window.renderAdminJustifs = renderAdminJustifs;
