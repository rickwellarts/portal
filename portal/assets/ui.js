// assets/ui.js — navbar com paths robustos e bootstrap assíncrono
import { requireAuth, getSession } from './auth.js';

/** Resolve caminhos relativos independentemente da pasta atual. */
function pathEnv() {
  const parts = location.pathname.split('/').filter(Boolean);
  const endsWithSlash = location.pathname.endsWith('/');
  const depth = Math.max(0, (endsWithSlash ? parts.length : parts.length - 1));
  const toRoot = depth === 0 ? '' : '../'.repeat(depth);

  return {
    toRoot,
    toAssets : `${toRoot}assets`,
    toPortal : `${toRoot}portal`,
    toModules: `${toRoot}modules`,
  };
}

/** Renderiza o HTML da navbar. NÃO chama requireAuth aqui dentro. */
export function renderNavbar(active = "", user = null) {
  const env = pathEnv();
  const s = user || getSession() || { nome: "", login: "", role: "user" };

  const displayName = s.nome || s.login || "Usuário";

  return `
<header class="navbar">
  <a href="${env.toPortal}/index.html" class="brand">
    <img src="${env.toAssets}/logo.png" alt="MRS" />
    <span>CCE 4.0</span>
  </a>

  <nav class="nav-center">
    <a ${active==='extrapolacao'?'class="active"':''} href="${env.toModules}/extrapolacao/index.html">Extrapolação</a>
    <a ${active==='descanso'?'class="active"':''} href="${env.toModules}/calculadora-descanso/index.html">Descanso</a>
    <a ${active==='carros'?'class="active"':''} href="${env.toModules}/controle-carros/index.html">Carros</a>
    <a ${active==='ex-simples'?'class="active"':''} href="${env.toModules}/extrapolacao-simples/index.html">Ex. Simples</a>
    <a ${active==='turno'?'class="active"':''} href="${env.toModules}/passagem-de-turno/index.html">Passagem de Turno</a>
    <a ${active==='puxas'?'class="active"':''} href="${env.toModules}/troca-de-puxas/index.html">Troca de Puxas</a>
  </nav>

  <div class="nav-right dropdown">
    <button class="user-btn">${displayName} ▾</button>
    <div class="dropdown-menu">
      <a href="${env.toPortal}/meus_dados.html" id="menuPerfil">Seus dados</a>
      ${s.role === 'admin' ? `<a href="${env.toRoot}admin/index.html">Admin</a>` : ''}
      <a href="${env.toRoot}index.html" id="menuLogoutLink">Sair</a>
    </div>
  </div>
</header>`;
}

/** Monte a navbar com sessão válida (aguarda requireAuth) e já faz o bind. */
export async function mountNavbar(active = "", mountId = "nav-mount") {
  // garante sessão (Firebase ou local) e espelha no localStorage
  const user = await requireAuth();

  const mount = document.getElementById(mountId);
  if (mount) {
    mount.innerHTML = renderNavbar(active, user);
    bindNavbar();
  }
  return user;
}

/** Interações de dropdown + logout. */
export function bindNavbar() {
  const btn  = document.querySelector('.user-btn');
  const menu = document.querySelector('.dropdown-menu');

  if (btn && menu) {
    btn.addEventListener('click', () => menu.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (e.target === btn || btn.contains(e.target)) return;
      if (!menu.contains(e.target)) menu.classList.remove('open');
    });
  }

  const logoutLink = document.getElementById('menuLogoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.cceAuth?.logout();
      location.href = logoutLink.getAttribute('href');
    });
  }
}
