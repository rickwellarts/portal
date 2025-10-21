// assets/admin_panels.js
import { listUsers, saveUsers, listTokens, saveTokens, getBlocked, setBlocked } from './admin_store.js';

/* util */
const esc = (s)=> (s??"").toString()
  .replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
const byTsDesc = (a,b)=> (b?.ts||0)-(a?.ts||0);

/* ========== TOKENS ========== */
export function bindTokens(doc = document){
  const mount = doc.getElementById('tokens-panel');
  if (!mount || mount.dataset.bound === '1') return;
  mount.dataset.bound = '1';

  function render(){
    const tokens = (listTokens()||[]).slice().sort(byTsDesc);
    mount.innerHTML = `
      <form id="tk-form" class="card" style="margin-bottom:16px;">
        <label for="tk-matricula">Matrícula (8 dígitos)</label>
        <input id="tk-matricula" class="input" maxlength="8" inputmode="numeric" pattern="\\d{8}" required>
        <button class="btn btn-primary" type="submit">Gerar Token</button>
      </form>
      <div class="card">
        <h3>Tokens gerados</h3>
        ${tokens.length ? `
          <table class="table">
            <thead><tr><th>Matrícula</th><th>Token</th><th>Gerado em</th><th>Ações</th></tr></thead>
            <tbody>
              ${tokens.map(t=>`
              <tr>
                <td>${esc(t.matricula)}</td>
                <td><code>${esc(t.token)}</code></td>
                <td>${t.ts ? new Date(t.ts).toLocaleString('pt-BR') : '-'}</td>
                <td>
                  <button class="btn btn-xs" data-act="copy" data-token="${esc(t.token)}">Copiar</button>
                  <button class="btn btn-xs" data-act="del" data-m="${esc(t.matricula)}">Apagar</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        ` : `<p class="muted">Sem tokens.</p>`}
      </div>`;

    // máscara numérica
    const el = mount.querySelector('#tk-matricula');
    if (el){
      const mask = ()=> el.value = el.value.replace(/\D/g,'').slice(0,8);
      el.addEventListener('input', mask);
      mask();
    }

    // submit
    const form = mount.querySelector('#tk-form');
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const m = (el?.value||'').trim();
      if (!/^\d{8}$/.test(m)) { el?.focus(); return; }

      const token = Math.random().toString(36).slice(2,8).toUpperCase();
      const ts = Date.now();
      const arr = listTokens() || [];

      // evita duplicados: atualiza o token da mesma matrícula
      const ix = arr.findIndex(x => x.matricula === m);
      if (ix >= 0) arr[ix] = { ...arr[ix], token, ts };
      else arr.push({ matricula:m, token, ts });

      saveTokens(arr);
      render();
      try {
        navigator.clipboard?.writeText(token);
        alert(`Token ${token} gerado para ${m} (copiado).`);
      } catch {
        alert(`Token ${token} gerado para ${m}.`);
      }
    });

    // ações de tabela
    mount.querySelectorAll('button[data-act]').forEach(btn=>{
      const act = btn.dataset.act;
      if (act === 'copy'){
        btn.addEventListener('click', ()=>{
          const tk = btn.dataset.token || '';
          navigator.clipboard?.writeText(tk);
          alert('Token copiado.');
        });
      }
      if (act === 'del'){
        btn.addEventListener('click', ()=>{
          const m = btn.dataset.m || '';
          let arr = listTokens() || [];
          arr = arr.filter(x => x.matricula !== m);
          saveTokens(arr);
          render();
        });
      }
    });
  }

  render();
}

/* ========== RELATÓRIOS ========== */
export function renderReportsPanel(doc = document){
  const mountShift = doc.getElementById('shift-reports');
  const mountCars  = doc.getElementById('cars-reports');
  if (!mountShift || mountShift.dataset.bound === '1') return;
  mountShift.dataset.bound = '1';

  // tenta múltiplas chaves para compatibilidade
  function readAny(keys, fallback=[]){
    for (const k of keys){
      try{
        const v = JSON.parse(localStorage.getItem(k) || 'null');
        if (Array.isArray(v) && v.length) return v;
      }catch{}
    }
    return fallback;
  }

  const turnosRaw = readAny([
    'passagens_turno_reports',
    'passagens_turno',
    'cce_passagens_turno'
  ], []);
  const carsRaw   = readAny([
    'carros_reports',
    'carros_storage',
    'controle_carros_reports'
  ], []);

  const now = Date.now();
  const seven = 7*24*60*60*1000;
  const last7 = a => (a||[]).filter(x=>{
    const t = Number(x.ts || x.time || x.data || x.createdAt || 0) || 0;
    return (now - t) <= seven;
  }).sort((a,b)=>(Number(b.ts||b.time||b.data||b.createdAt||0)||0)-(Number(a.ts||a.time||a.data||a.createdAt||0)||0));

  function liReport(it, labelKey='title'){
    const when = new Date(Number(it.ts||it.time||it.data||it.createdAt||now)).toLocaleString('pt-BR');
    const label = esc(it[labelKey] || it.resumo || it.nome || '(sem título)');
    const url = it.url || it.link || it.pdf;
    return `<li>${when} — ${label}${url?` — <a href="${esc(url)}" target="_blank" rel="noopener">abrir</a>`:''}</li>`;
  }

  const turnos = last7(turnosRaw);
  const carros = last7(carsRaw);

  mountShift.innerHTML = `
    <div class="card">
      <h3>Passagens de turno (últimos 7 dias)</h3>
      <ul class="list-flat">
        ${ turnos.length ? turnos.map(it=>liReport(it,'resumo')).join('') : '<li class="muted">Sem relatórios.</li>' }
      </ul>
    </div>`;

  mountCars.innerHTML = `
    <div class="card">
      <h3>Controle de Carros (últimos 7 dias)</h3>
      <ul class="list-flat">
        ${ carros.length ? carros.map(it=>liReport(it,'resumo')).join('') : '<li class="muted">Sem relatórios.</li>' }
      </ul>
    </div>`;
}

/* ========== USUÁRIOS ========== */
export function bindUsers(doc = document){
  const mount = doc.getElementById('users-panel');
  if (!mount || mount.dataset.bound === '1') return;
  mount.dataset.bound = '1';

  function render(){
    const users = (listUsers()||[]).slice().sort((a,b)=> (a.login||'').localeCompare(b.login||''));
    const blocked = getBlocked();
    mount.innerHTML = `
      <div class="card">
        <table class="table">
          <thead>
            <tr><th>Login</th><th>Nome</th><th>E-mail</th><th>Matrícula</th><th>Perfil</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            ${users.map(u=>`
              <tr>
                <td>${esc(u.login)}</td>
                <td>${esc(u.nome||'')}</td>
                <td>${esc(u.email||'')}</td>
                <td>${esc(u.matricula||'')}</td>
                <td>${esc(u.role||'user')}</td>
                <td>${blocked.has(u.login) || u.active===false ? '<span style="color:#f66">Bloqueado</span>' : 'OK'}</td>
                <td>
                  <button class="btn btn-xs" data-act="toggle-role" data-login="${esc(u.login)}">${(u.role==='admin')?'Rebaixar':'Tornar admin'}</button>
                  <button class="btn btn-xs" data-act="toggle-block" data-login="${esc(u.login)}">${blocked.has(u.login)?'Desbloquear':'Bloquear'}</button>
                  <button class="btn btn-xs" data-act="del" data-login="${esc(u.login)}">Excluir</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;

    mount.querySelectorAll('button[data-act]').forEach(btn=>{
      const act = btn.dataset.act;
      const login = btn.dataset.login;
      btn.addEventListener('click', ()=>{
        let users = listUsers();
        if (act==='toggle-role'){
          users = users.map(u=> u.login===login ? {...u, role: (u.role==='admin'?'user':'admin')} : u);
          saveUsers(users); render();
        } else if (act==='toggle-block'){
          const blk = getBlocked();
          if (blk.has(login)) blk.delete(login); else blk.add(login);
          setBlocked(blk); render();
        } else if (act==='del'){
          if (!confirm('Excluir usuário permanentemente?')) return;
          users = users.filter(u=> u.login!==login);
          saveUsers(users); render();
        }
      });
    });
  }
  render();
}

/* ========== EXTRAPOLAÇÕES ========== */
export function bindExtrapolations(doc = document){
  const mount = doc.getElementById('extrap-panel');
  if (!mount || mount.dataset.bound === '1') return;
  mount.dataset.bound = '1';

  function lerPendentes(){ try { return JSON.parse(localStorage.getItem('extrap_justif_pendentes')||'[]'); } catch { return []; } }
  function lerFinalizadas(){ try { return JSON.parse(localStorage.getItem('extrap_justif_finalizadas')||'[]'); } catch { return []; } }

  function fmt(ts){
    try { return new Date(ts).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }); }
    catch { return '—'; }
  }

  function itemHtml(j, tipo){
    // título SEM “0 min” (somente Prefixo — Nome)
    const titulo = `<strong>${j.prefixo || '—'} — ${j.maquinista || '—'}</strong>`;
    // botão de detalhes apenas para finalizadas
    const btn = (tipo==='fin')
      ? `<button class="btn btn-xs" data-act="det" data-id="${j.id}">Ver detalhes</button>`
      : '';
    return `<li data-id="${j.id}" data-tipo="${tipo}" style="display:flex;align-items:center;gap:8px;">${titulo} ${btn}</li>`;
  }

  function render(){
    const pend = lerPendentes();
    const fins = lerFinalizadas();

    mount.innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <h3>Justificativas</h3>
        ${fins.length
          ? `<ul class="list-flat" id="fin-list">
               ${fins.map(j => itemHtml(j,'fin')).join('')}
             </ul>`
          : `<p class="muted">Nenhuma justificativa registrada ainda.</p>`}
      </div>
      <div class="card">
        <h3>Pendentes</h3>
        ${pend.length
          ? `<ul class="list-flat" id="pen-list">
               ${pend.map(j => itemHtml(j,'pen')).join('')}
             </ul>`
          : `<p class="muted">Nenhuma pendente.</p>`}
      </div>
    `;

    // click: abrir detalhes (somente finalizadas)
    mount.querySelectorAll('button[data-act="det"]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id;
        const fin = lerFinalizadas().find(x=> String(x.id) === String(id));
        if (!fin) return;
        const msg = `
          <div style="display:grid;gap:6px;">
            <div><strong>Prefixo:</strong> ${fin.prefixo || '—'}</div>
            <div><strong>Maquinista:</strong> ${fin.maquinista || '—'}</div>
            <div><strong>Registrado por:</strong> ${fin.registradoPor || '—'}</div>
            <div><strong>Registrado em:</strong> ${fmt(fin.fechadoEm)}</div>
            <hr style="border-color:rgba(255,255,255,.12);">
            <div><strong>Justificativa</strong></div>
            <div style="white-space:pre-wrap;">${
              (fin.motivo||'—')
                .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            }</div>
          </div>`;
        // usa o helper global definido no admin/index.html
        if (typeof window.openModal === 'function'){
          window.openModal({ title:'Detalhes da justificativa', message: msg, showCancel: false, okText:'Fechar' });
        } else {
          alert('Detalhes indisponíveis (modal não encontrado).');
        }
      });
    });
  }

  render();

  // re-render automático quando outra aba do portal altera localStorage
  window.addEventListener('storage', (ev)=>{
    if (ev.key === 'extrap_justif_finalizadas' || ev.key === 'extrap_justif_pendentes'){
      render();
    }
  });
}

