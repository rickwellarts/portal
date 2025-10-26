// assets/auth_bindings.js (híbrido Firebase + localStorage) — revisão Jarvis
import { signin, signup } from "./auth.js";

/* util: calcula caminho até a raiz para redirecionar de qualquer subpasta */
function toRootPath(){
  const parts = location.pathname.split('/').filter(Boolean);
  const endsWithSlash = location.pathname.endsWith('/');
  const depth = Math.max(0, (endsWithSlash ? parts.length : parts.length - 1));
  return depth === 0 ? "" : "../".repeat(depth);
}

/* util: bloqueia duplo submit por 1,5s para evitar duplicação */
function withSubmitting(btn, fn){
  if (!btn) return fn();
  if (btn.dataset.submitting === "1") return;
  btn.dataset.submitting = "1";
  const oldDisabled = btn.disabled;
  const oldLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Processando…";
  return Promise.resolve(fn()).finally(()=>{
    setTimeout(()=>{
      btn.dataset.submitting = "0";
      btn.disabled = oldDisabled;
      btn.textContent = oldLabel;
    }, 1500);
  });
}

/* ===================== LOGIN ===================== */
const lf = document.getElementById("login-form");
if (lf){
  // Preenche último login usado (conveniência)
  try {
    const last = localStorage.getItem("last_login") || "";
    const inputLogin = document.getElementById("login") || document.getElementById("matricula");
    if (inputLogin && last) inputLogin.value = last;
  } catch {}

  lf.addEventListener("submit", (e)=>{
    e.preventDefault();
    const el = document.getElementById("login") || document.getElementById("matricula");
    const senhaEl = document.getElementById("senha");
    let loginOrMatricula = (el ? el.value : "").trim();
    const senha = (senhaEl ? senhaEl.value : "").trim();
    const btn = lf.querySelector('button[type="submit"]');
    const errBox = document.getElementById("loginError");

    // se parece e-mail, padroniza minúsculas
    if (loginOrMatricula.includes("@")) loginOrMatricula = loginOrMatricula.toLowerCase();
    if (errBox) errBox.textContent = "";

    withSubmitting(btn, async ()=>{
      try {
        await signin({ loginOrMatricula, senha }); // ✅ Firebase (quando e-mail) ou localStorage (legado)
        try { localStorage.setItem("last_login", loginOrMatricula); } catch {}
        location.href = `${toRootPath()}portal/index.html`;
      } catch (err) {
        const msg = err?.message || "Falha ao autenticar.";
        console.warn("[login]", msg);
        if (errBox) {
          errBox.textContent = msg;
          errBox.style.display = "block";
        } else {
          alert(msg);
        }
        (el && !loginOrMatricula ? el : senhaEl)?.focus();
      }
    });
  });

  // Máscara opcional para matrícula
  const m = document.getElementById("matricula");
  if (m){
    m.setAttribute("inputmode","numeric");
    m.setAttribute("maxlength","8");
    m.addEventListener("input", ()=>{ m.value = m.value.replace(/\D/g,'').slice(0,8); });
  }
}

/* ===================== PRIMEIRO ACESSO (CADASTRO) ===================== */
const sf = document.getElementById("signup-form");
if (sf){
  sf.addEventListener("submit", (e)=>{
    e.preventDefault();
    const matricula = (document.getElementById("s-matricula")?.value || "").trim();
    const nome      = (document.getElementById("s-nome")?.value || "").trim();
    const email     = (document.getElementById("s-email")?.value || "").trim().toLowerCase();
    const senha     = (document.getElementById("s-senha")?.value || "").trim();
    const token     = (document.getElementById("s-token")?.value || "").trim();
    const loginEl   = document.getElementById("s-login");
    const login     = (loginEl && loginEl.value.trim()) || matricula;
    const btn = sf.querySelector('button[type="submit"]');

    withSubmitting(btn, async ()=>{
      try {
        await signup({ login, nome, email, matricula, senha, token });
        alert("Cadastro efetuado! Faça login.");
        location.href = `${toRootPath()}index.html?signup=ok`;
      } catch (err) {
        const msg = err?.message || "Falha no cadastro.";
        console.error("[signup]", msg);
        alert(msg);
      }
    });
  });

  // máscara para matrícula no cadastro
  const m = document.getElementById("s-matricula");
  if (m){
    m.setAttribute("inputmode","numeric");
    m.setAttribute("maxlength","8");
    m.addEventListener("input", ()=>{ m.value = m.value.replace(/\D/g,'').slice(0,8); });
  }
}

/* ===================== UX extra (mensagens de URL) ===================== */
(function showQueryAlerts(){
  const q = new URLSearchParams(location.search);
  const msgBox = document.getElementById("loginError");
  const setMsg = m => {
    if (msgBox) { msgBox.textContent = m; msgBox.style.display = "block"; }
    else alert(m);
  };

  if (q.get("blocked") === "1")
    setMsg("Sessão encerrada. Usuário bloqueado ou inválido.");
  else if (q.get("signup") === "ok")
    setMsg("Cadastro realizado. Faça login.");
})();
