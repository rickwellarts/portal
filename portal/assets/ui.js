// /assets/ui.js — Navbar robusta (paths absolutos) + dropdown do usuário
import { getSession } from '/assets/auth.js';

// Renderiza a navbar. A página deve ter chamado requireAuth() antes.
export function renderNavbar(active = '') {
  const s = getSession() || {};
  const nome = s.nome || s.login || 'Usuário';
  const isAdmin = (s.role === 'admin');

  return `
<header class="navbar">
  <a href="/portal/index.html" class="brand">
    <img src="/assets/logo.png" alt="MRS" />
    <span>CCE 4.0</span>
  </a>

  <nav class="nav-center">
    <a ${active==='extrapolacao' ? 'class="active"' : ''} href="/modules/extrapolacao/index.html">Extrapolação</a>
    <a ${active==='descanso' ? 'class="active"' : ''} href="/modules/calculadora-descanso/index.html">Descanso</a>
    <a ${active==='carros' ? 'class="active"' : ''} href="/modules/controle-carros/index.html">Carros</a>
    <a ${active==='ex-simples' ? 'class="active"' : ''} href="/modules/extrapolacao-simples/index.html">Ex. Simples</a>
    <a ${active==='turno' ? 'class="active"' : ''} href="/modules/passagem-de-turno/index.html">Passagem de Turno</a>
    <a ${active==='puxas' ? 'class="active"' : ''} href="/modules/troca-de-puxas/index.html">Troca de Puxas</a>
  </nav>

  <div class="nav-right dropdown">
    <button class="user-btn" type="button">${nome} ▾</button>
    <div class="dropdown-menu">
      <a href="/portal/meus_dados.html" id="menuPerfil">Seus dados</a>
      ${isAdmin ? `<a href="/admin/index.html">Admin</a>` : ``}
      <a href="/index.html" id="menuLogoutLink">Sair</a>
    </div>
  </div>
</header>`;
}

// Liga os handlers do dropdown e do logout
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
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const m = await import('/assets/auth.js');
        if (m?.logout) await m.logout();
      } finally {
        location.href = logoutLink.getAttribute('href') || '/index.html';
      }
    });
  }
}
