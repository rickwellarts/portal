import { initMascotNotifier } from "./news.js";

// 1) Sessão
const session = JSON.parse(localStorage.getItem("session_user") || "null");
if (!session) { location.href = "../index.html"; }

// 2) Tenta chamar o construtor do seu portal, seja qual for o nome
const candidates = ["buildPortalLayout","renderPortal","renderMenu","initPortal"];
let rendered = false;
for (const fn of candidates){
  try {
    if (typeof window[fn] === "function") { window[fn](session); rendered = true; break; }
  } catch(e){
    console.error("Erro ao executar", fn, e);
  }
}

// 3) Fallback: se nenhum builder existia, desenha um menu básico pra não ficar "vazio"
if (!rendered){
  const host = document.querySelector("#app") || document.body;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <nav class="card" style="margin:16px; padding:12px;">
      <strong>Menu</strong>
      <ul style="margin-top:8px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
        <li><a href="../admin/index.html" class="btn btn-secondary">Admin</a></li>
        <li><a href="./meus_dados.html" class="btn">Seus dados</a></li>
      </ul>
    </nav>
    <section class="card" style="margin:16px; padding:12px;">
      <h2>Bem-vindo, ${session?.nome || session?.login || ""}</h2>
      <p>Seu portal foi carregado no modo básico. Assim que o script de UI estiver disponível, o layout completo aparece aqui.</p>
    </section>
  `;
  host.prepend(wrap);
}

// 4) Mascote / balão
window.addEventListener("DOMContentLoaded", ()=> initMascotNotifier());
