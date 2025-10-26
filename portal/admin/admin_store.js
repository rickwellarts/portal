// assets/admin_store.js
const LS_USERS="portal_users", LS_TOKENS="portal_tokens", LS_NEWS="portal_news", LS_BLOCKED="portal_blocked_users";
function load(k,f){ try{ return JSON.parse(localStorage.getItem(k)) ?? f; }catch(e){ return f; } }
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
export function bootstrapAdmin(){
  const users = load(LS_USERS, []);
  if (!users.find(u=>u.login==="mrs")){
    users.push({login:"mrs", nome:"Administrador", email:"admin@portal", matricula:"00000000", senha:"123456", role:"admin", blocked:false});
    save(LS_USERS, users);
  }
}
export function listUsers(){ return load(LS_USERS, []); }
export function saveUsers(u){ save(LS_USERS, u); }
export function listTokens(){ return load(LS_TOKENS, []); }
export function saveTokens(t){ save(LS_TOKENS, t); }
export function listNews(){ return load(LS_NEWS, []); }
export function saveNews(n){ save(LS_NEWS, n); }
export function getBlocked(){ return new Set(load(LS_BLOCKED, [])); }
export function setBlocked(set){ save(LS_BLOCKED, Array.from(set)); }
export function consumeToken(matricula, token){
  const tokens = listTokens();
  const idx = tokens.findIndex(t=> t.matricula===matricula && t.token===token);
  if (idx === -1) return false;
  tokens.splice(idx,1);
  saveTokens(tokens);
  return true;
}

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
      <div><strong>Registrado por:</strong> ${j.registradoPor || "—"}</div>
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
