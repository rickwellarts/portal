// portal/assets/first_access.js
// Lógica para a página primeiro acesso (signup) — usa Cloud Function HTTP endpoint

const PROJECT_ID = 'portal-cce'; // from user
const FUNCTIONS_REGION = 'us-central1';
const BASE = `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net`;

function el(id){ return document.getElementById(id); }
function showMessage(host, txt, isError = false){ if(!host) return; host.textContent = txt || ''; host.className = isError ? 'error' : 'muted'; }

window.addEventListener('DOMContentLoaded', ()=>{
  const form = el('signup-form'); if(!form) return;
  const matricula = el('s-matricula');
  const nome = el('s-nome');
  const email = el('s-email');
  const senha = el('s-senha');
  const token = el('s-token');
  const msg = el('signupError');

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    showMessage(msg, '');
    try{
      const data = {
        login: matricula.value || matricula.value || '',
        nome: nome.value || '',
        email: email.value || '',
        matricula: matricula.value || '',
        senha: senha.value || '',
        token: token.value || ''
      };

      // Validações front-end
      if(!/^\d{8}$/.test(String(data.matricula))){ throw new Error('Matrícula inválida. Use 8 dígitos.'); }
      if(!data.nome) throw new Error('Informe o nome.');
      if(!data.email) throw new Error('Informe o e-mail.');
      if(!data.senha || data.senha.length < 6) throw new Error('Informe uma senha com ao menos 6 caracteres.');
      if(!data.token) throw new Error('Token é obrigatório para o primeiro acesso.');

      const res = await fetch(`${BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const j = await res.json();
      if(!res.ok) throw new Error(j?.error || j?.message || 'Falha ao criar conta.');

      showMessage(msg, 'Conta criada com sucesso. Redirecionando...', false);
      setTimeout(()=> location.href = './index.html', 900);
    }catch(err){ showMessage(msg, err?.message || String(err), true); }
  });
});
