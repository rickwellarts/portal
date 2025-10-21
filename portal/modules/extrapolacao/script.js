/* =========================================================
   HELPERS DE MODAL (globais, acessíveis de qualquer função)
   ========================================================= */
function __modalEls() {
  const modalEl = document.getElementById("cce-modal");
  return {
    modalEl,
    title: modalEl?.querySelector("#cce-modal-title"),
    msg: modalEl?.querySelector("#cce-modal-msg"),
    ok: modalEl?.querySelector('[data-action="ok"]'),
    cancel: modalEl?.querySelector('[data-action="cancelar"]'),
  };
}

function openModal({ title = "Confirmação", message = "", showCancel = true, okText = "OK", cancelText = "Cancelar" } = {}) {
  return new Promise((resolve) => {
    const { modalEl, title: t, msg, ok, cancel } = __modalEls();
    if (!modalEl) return resolve(false);

    t.textContent = title;
    msg.innerHTML = message; // aceita HTML
    ok.textContent = okText;
    cancel.textContent = cancelText;
    cancel.style.display = showCancel ? "" : "none";
    modalEl.setAttribute("aria-hidden", "false");

    const onKey = (e) => {
      if (e.key === "Escape") { close(false); }
      if (e.key === "Enter") {
        const ta = modalEl.querySelector("textarea");
        if (ta && document.activeElement === ta) return; // não confirma com Enter dentro do textarea
        close(true);
      }
    };
    const onClick = (e) => {
      const act = e.target.closest("[data-action]")?.dataset.action;
      if (act === "ok") return close(true);
      if (act === "cancelar" || e.target.dataset.close === "true") return close(false);
    };

    function close(result) {
      modalEl.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onKey);
      modalEl.removeEventListener("click", onClick);
      resolve(result);
    }

    document.addEventListener("keydown", onKey);
    modalEl.addEventListener("click", onClick);
    setTimeout(() => ok?.focus(), 0);
  });
}

function confirmModal(message, opts = {}) {
  return openModal({ title: "Confirmação", message, showCancel: true, ...opts });
}
function alertModal(message, opts = {}) {
  return openModal({ title: "Aviso", message, showCancel: false, okText: "OK", ...opts });
}

function promptModal({
  title = "Justificativa de extrapolação",
  introHTML = "",
  okText = "Enviar",
  cancelText = "Cancelar",
  placeholder = "Descreva o motivo…",
} = {}) {
  return new Promise((resolve) => {
    const { modalEl, title: t, msg, ok, cancel } = __modalEls();
    if (!modalEl) return resolve(null);

    t.textContent = title;
    msg.innerHTML = `
      <div style="margin-bottom:8px;">${introHTML}</div>
      <label for="ccej-text" style="display:block;margin:6px 0 6px 0;">Motivo</label>
      <textarea id="ccej-text" rows="4"
        style="width:100%;padding:10px 12px;border-radius:10px;background:#0e1318;border:1px solid rgba(255,255,255,.12);color:#e8edf5;"
        placeholder="${placeholder}"></textarea>
    `;
    ok.textContent = okText;
    cancel.textContent = cancelText;
    cancel.style.display = "";
    modalEl.setAttribute("aria-hidden", "false");

    const textarea = () => modalEl.querySelector("#ccej-text");

    function close(result) {
      modalEl.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onKey);
      modalEl.removeEventListener("click", onClick);
      resolve(result);
    }
    function onKey(e) {
      if (e.key === "Escape") return close(null);
      if (e.key === "Enter" && document.activeElement === textarea()) {
        const v = textarea().value.trim();
        if (!v) return;
        return close(v);
      }
    }
    function onClick(e) {
      const act = e.target.closest("[data-action]")?.dataset.action;
      if (act === "ok") {
        const v = textarea().value.trim();
        if (!v) { textarea().focus(); return; }
        return close(v);
      }
      if (act === "cancelar" || e.target.dataset.close === "true") return close(null);
    }

    document.addEventListener("keydown", onKey);
    modalEl.addEventListener("click", onClick);
    setTimeout(() => textarea()?.focus(), 0);
  });
}

/* =========================================================
   HELPER: Descobrir o usuário logado (nome) no localStorage
   ========================================================= */
// Busca o nome do usuário logado em localStorage, sessionStorage ou JWT
function getLoggedUserName() {
  // tenta ler objetos/strings dos storages
  function scanStorage(storage) {
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const lkey = key.toLowerCase();
        const val = storage.getItem(key) || "";

        // 1) objetos comuns: { name, fullName, displayName, username, user:{name} }
        if (lkey.includes("user") || lkey.includes("auth") || lkey.includes("profile")) {
          try {
            const obj = JSON.parse(val);
            const name = obj?.name || obj?.fullName || obj?.displayName || obj?.username || obj?.user?.name;
            if (name && typeof name === "string") return name;
          } catch {}
        }

        // 2) tokens JWT
        if (lkey.includes("token") && val.split(".").length === 3) {
          try {
            const payload = JSON.parse(atob(val.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
            const name = payload?.name || payload?.preferred_username || payload?.username;
            if (name && typeof name === "string") return name;
          } catch {}
        }
      }
    } catch {}
    return null;
  }

  // 1) storages (ordem: local -> session)
  const fromLS = scanStorage(localStorage);
  if (fromLS) return fromLS;

  const fromSS = scanStorage(sessionStorage);
  if (fromSS) return fromSS;

  // 2) chaves simples de fallback
  const simple =
    localStorage.getItem("username") ||
    sessionStorage.getItem("username") ||
    localStorage.getItem("user_name") ||
    sessionStorage.getItem("user_name");
  if (simple) return simple;

  // 3) último recurso: tentar ler do chip/btn do usuário no navbar
  try {
    const nav = document.querySelector("#nav-mount");
    if (nav) {
      // pega o botão/elemento que mostra o nome (ajusta seletores se precisar)
      const el =
        nav.querySelector('[data-user], [data-username], .user-name, .userchip, button[aria-haspopup="menu"]') ||
        nav.querySelector("button, .chip, .menu-trigger");
      const t = el?.textContent?.trim();
      if (t && t.length <= 40 && /\S/.test(t)) return t;
    }
  } catch {}

  return null;
}


/* =========================================================
   APP
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const LS_KEY = "trens";
  let trens = JSON.parse(localStorage.getItem(LS_KEY)) || [];
  let editandoId = null;
  let activeArea = "CORREDOR";
  const FATOR_NOTURNO = 1.43;

  // timers
  const tickTimers = new Set();
  const repeatTimers = new Map();
  const nextBeepAt = new Map();

  // áudio
  let audioCtx;
  let somAtivo = true;
  let volumeAtual = 1.0;

  // els
  const soundToggle = document.getElementById("sound-toggle");
  const volumeControl = document.getElementById("volume-control");
  const buscaInput = document.getElementById("busca");
  const searchExact = document.getElementById("search-exact");
  const filterVazios = document.getElementById("filter-vazios");
  const filterCarregados = document.getElementById("filter-carregados");
  const filterComObs = document.getElementById("filter-com-obs");
  const ordenarPor = document.getElementById("ordenar-por");
  const selectIntervalo = document.getElementById("repeat-interval");
  const toasts = document.getElementById("toasts");
  const banner = document.getElementById("banner-alerts");

  // ==== Helpers ====
  const __norm = (s) => (s || "").toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  function __getFilters() {
    return {
      q: __norm(buscaInput?.value || ""),
      exact: !!(searchExact && searchExact.checked),
      showVazios: filterVazios ? filterVazios.checked : true,
      showCarregados: filterCarregados ? filterCarregados.checked : true,
      onlyObs: !!(filterComObs && filterComObs.checked),
    };
  }

  function __passesSearchFilter(t, F) {
    const q = F.q;
    if (!q) return true;
    const pref = __norm(t.prefixo);
    const nome = __norm(t.maquinista);

    if (F.exact) {
      const prefClean = pref.replace(/[\s\-_.]/g, "");
      const qClean = q.replace(/[\s\-_.]/g, "");
      return prefClean === qClean;
    }
    const prefixMatch = pref.includes(q);
    const qTokens = q.split(/\s+/).filter(Boolean);
    const nomeTokens = nome.split(/\s+/).filter(Boolean);
    const nameMatch = qTokens.every(tok => nomeTokens.some(nt => nt.startsWith(tok)));
    return prefixMatch || nameMatch;
  }

  function __passesTypeObs(t, F) {
    if (F.onlyObs && !(t.obs && String(t.obs).trim())) return false;
    if (t.tipo === "vazio" && !F.showVazios) return false;
    if (t.tipo === "carregado" && !F.showCarregados) return false;
    return true;
  }

  function salvarLocal(){ localStorage.setItem(LS_KEY, JSON.stringify(trens)); }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function hhmm(dateObj) { return `${pad2(dateObj.getHours())}:${pad2(dateObj.getMinutes())}`; }
  function targetDateFromHHMM(hhmmStr){
    const [h,m]=hhmmStr.split(":").map(Number);
    const now=new Date();
    const tgt=new Date(now); tgt.setHours(h,m,0,0);
    if (tgt<=now) tgt.setDate(tgt.getDate()+1);
    return +tgt;
  }
  function restanteToneClass(ms) {
    const H = 60 * 60 * 1000;
    if (ms >= 8 * H) return "tone-green";
    if (ms >= 4 * H) return "tone-yellow";
    if (ms >= 2 * H) return "tone-orange";
    if (ms >= 1 * H) return "tone-orange";
    return "tone-red";
  }
  function getIntervaloMs(){
    const min = parseInt(selectIntervalo?.value || "5", 10);
    return Math.max(1, min) * 60 * 1000;
  }

  // ====== Áudio ======
  function beep(duracaoMs = 220, freq = 880, volume = 1.0) {
    try {
      if (!somAtivo) return;
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = volume;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      setTimeout(() => { o.stop(); o.disconnect(); g.disconnect(); }, duracaoMs);
    } catch {}
  }
  function beepBurst(qtd = 10, intervaloMs = 180, duracaoMs = 160, freq = 920) {
    if (!somAtivo) return;
    let tocados = 0;
    const id = setInterval(() => {
      if (tocados >= qtd) { clearInterval(id); return; }
      beep(duracaoMs, freq, volumeAtual);
      tocados++;
    }, intervaloMs);
  }

  // ====== Toasts & Banner ======
  function showToast(msg){
    if (!toasts) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<strong>⚠️ Risco</strong> <span>${msg}</span> <button class="close" aria-label="fechar">×</button>`;
    toasts.appendChild(el);
    el.querySelector(".close").addEventListener("click", ()=> el.remove());
    setTimeout(()=> el.remove(), 10000);
  }
  function updateBanner(){
    if (!banner) return;
    const risks = trens.filter(t => t.riscoAtivo && (repeatTimers.has(t.id) || (nextBeepAt.get(t.id) && nextBeepAt.get(t.id) > Date.now())));
    if (!risks.length){
      banner.innerHTML = "";
      banner.style.display = "none";
      return;
    }
    banner.style.display = "block";
    banner.innerHTML = `<h4>⚠️ Trens em risco</h4><ul>` + risks.map(t => {
      return `<li>${t.area || "—"} • ${t.prefixo || ""} — ${t.maquinista || ""}</li>`;
    }).join("") + `</ul>`;
  }

  // ====== Cálculo da extrapolação ======
  // ====== Cálculo de extrapolação (MRS oficial) ======
function calcularExtrapolacaoPrecisao(horaInicialStr) {
  // usa a função exata da MRS com interpolação pelos pontos-âncora
  return new Date(targetDateFromHHMM(computeExtrapTime(horaInicialStr).extrapola));
}

// Ponderação oficial (10h econômicas, fator 1.43 noturno)
const FATOR_NOTURNO_ANCHOR = 1.43;
const ANCHORS = [
  ["19:50", "04:51"],
  ["21:30", "06:18"],
  ["22:00", "07:00"],
  ["23:40", "08:54"],
  ["00:00", "09:17"],
  ["15:00", "00:37"] // incluído da planilha
];

function parseHHMM(s){ const [h,m]=s.split(":").map(Number); return h*60+m; }
function toHHMM(totalMin){
  totalMin = ((totalMin % (24*60)) + (24*60)) % (24*60);
  const h = Math.floor(totalMin/60), m = Math.round(totalMin%60);
  return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`;
}

function computeExtrapTime(startHHMM) {
  const startMin = parseHHMM(startHHMM);
  // procura o intervalo entre dois pontos conhecidos
  for (let i=0;i<ANCHORS.length-1;i++){
    const [s1, e1] = ANCHORS[i];
    const [s2, e2] = ANCHORS[i+1];
    const start1 = parseHHMM(s1), start2 = parseHHMM(s2);
    const ex1 = parseHHMM(e1), ex2 = parseHHMM(e2);
    // considera passagem de meia-noite
    const span = (start2 >= start1) ? (start2 - start1) : (24*60 - (start1 - start2));
    const dist = ((startMin - start1 + 24*60) % (24*60)) / span;
    if (((startMin >= start1) && (startMin < start2)) || (i===ANCHORS.length-2)) {
      // interpolação linear entre âncoras
      const exMin = (ex1 + dist * ((ex2 - ex1 + 24*60) % (24*60))) % (24*60);
      const estMin = (startMin + 12*60) % (24*60);
      return { extrapola: toHHMM(exMin), estoura: toHHMM(estMin) };
    }
  }
  // fallback genérico (caso fora dos intervalos)
  return { extrapola: toHHMM((startMin + 10*60) % (24*60)), estoura: toHHMM((startMin + 12*60) % (24*60)) };
}


  // ====== Controles de áudio ======
  soundToggle?.addEventListener("change", e => {
    somAtivo = e.target.checked;
    if (somAtivo) beep(100, 1400, volumeAtual);
  });
  volumeControl?.addEventListener("input", e => {
    volumeAtual = parseFloat(e.target.value);
    beep(120, 1100, volumeAtual);
  });
  selectIntervalo?.addEventListener("change", () => updateBanner());

  // ====== Tabs (áreas) ======
  document.querySelectorAll(".tab")?.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      activeArea = btn.dataset.area;
      render();
      ensureJustifyCTA();
      updateJustifyCTA();
    });
  });

  // busca / filtros
  [buscaInput, searchExact, filterVazios, filterCarregados, filterComObs, ordenarPor]
    .forEach(el => el && el.addEventListener("input", render));

  // ====== Repetição de beep ======
  function stopRepeat(id){
    const tmr = repeatTimers.get(id);
    if (tmr){ clearInterval(tmr); repeatTimers.delete(id); }
    nextBeepAt.delete(id);
    updateBanner();
  }
  function startRepeat(t){
    if (repeatTimers.has(t.id)) return;
    const intervalMs = getIntervaloMs();
    nextBeepAt.set(t.id, Date.now() + intervalMs);
    const timer = setInterval(()=>{
      const now = Date.now();
      if (!t.riscoAtivo){ stopRepeat(t.id); return; }
      if (t.extrapolacaoTs - now <= 0){ stopRepeat(t.id); return; }
      beepBurst(10, 180, 160, 920);
      nextBeepAt.set(t.id, now + getIntervaloMs());
      updateBanner();
    }, intervalMs);
    repeatTimers.set(t.id, timer);
    updateBanner();
  }

  // ====== UI ======
  function limparCampos(){
    ["maquinista","auxiliar","prefixo","horario","inicio","obs"].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const tipoSel = document.getElementById("tipo");
    if (tipoSel) tipoSel.value="vazio";
    const btnCad = document.getElementById("cadastrar");
    if (btnCad) btnCad.innerText="Cadastrar Trem";
    editandoId=null;
  }

  function criarCard(t){
    const card = document.createElement("div");
    card.className = "card " + (t.tipo || "");

    const dados = document.createElement("div");
    const h4 = document.createElement("h4"); h4.innerText = t.maquinista || "-"; dados.appendChild(h4);

    const p1 = document.createElement("p"); p1.innerHTML = `Prefixo: <span>${t.prefixo || "-"}</span>`;
    const p2 = document.createElement("p"); p2.innerHTML = `Horário (Apresentação): <span>${t.horario || "-"}</span>`;
    const p3 = document.createElement("p"); p3.innerHTML = `Trem (Início): <span>${t.inicio || "-"}</span>`;
    const p4 = document.createElement("p"); p4.innerHTML = `Extrapolação: <span>${t.extrapolacaoHHMM || "-"}</span>`;
    dados.append(p1,p2,p3,p4);

    if (t.auxiliar){ const pAux = document.createElement("p"); pAux.innerHTML=`Auxiliar: <span>${t.auxiliar}</span>`; dados.appendChild(pAux); }
    if (t.obs){ const pObs = document.createElement("p"); pObs.innerHTML=`Obs.: <span>${t.obs}</span>`; dados.appendChild(pObs); }

    const restante = document.createElement("p");
    restante.className = "restante";
    restante.innerText = "Restante: --:--:--";
    dados.appendChild(restante);

    const nextBeep = document.createElement("p");
    nextBeep.className = "next-beep";
    nextBeep.innerText = "Próximo beep: --:--";
    dados.appendChild(nextBeep);

    // risco toggle
    const risco = document.createElement("label");
    risco.className = "risco";
    const chk = document.createElement("input");
    chk.type = "checkbox"; chk.checked = t.riscoAtivo !== false;
    const span = document.createElement("span"); span.textContent = "Risco ativo (repetir)";
    risco.append(chk, span);
    dados.appendChild(risco);

    const botoes = document.createElement("div");
    botoes.className = "botoes";

    const bEdit = document.createElement("button"); bEdit.className="btn"; bEdit.setAttribute("aria-label","Editar"); bEdit.title="Editar"; bEdit.textContent="✏️";
    bEdit.onclick = ()=>carregarParaEdicao(t.id);

    const bDel = document.createElement("button"); bDel.className="btn ghost"; bDel.setAttribute("aria-label","Excluir"); bDel.title="Excluir"; bDel.textContent="❌";
    bDel.onclick = async ()=>{
      const ok = await confirmModal(`Excluir o trem ${t.prefixo} (${t.maquinista})?`);
      if (!ok) return;
      const ix = trens.findIndex(x=>x.id===t.id);
      if (ix>=0){ stopRepeat(t.id); trens.splice(ix,1); salvarLocal(); render(); }
    };

    botoes.append(bEdit,bDel);
    card.append(dados,botoes);

    // listeners
    chk.addEventListener("change", ()=>{
      t.riscoAtivo = chk.checked;
      salvarLocal();
      if (!t.riscoAtivo) stopRepeat(t.id);
    });

    function tick(){
      const now = Date.now();
      const diff = t.extrapolacaoTs - now;
      const total = Math.floor(diff/1000);

      if (diff<=0){
        restante.classList.add("blink");
        restante.innerText="Restante: EXTRAPOLADO";
        nextBeep.innerText = "Próximo beep: —";
        stopRepeat(t.id);

        if (!t._extrapRegistered) {
          t._extrapRegistered = true;
          salvarLocal();
          try { cceRegisterExtrapFromTrain(t); } catch(e) {}
        }
        if (!t._extrapToast) {
          t._extrapToast = true; salvarLocal();
          showToast(`EXTRAPOLADO • ${t.prefixo || ""} — ${t.maquinista || ""}`);
        }
        return;
      }

      const H=Math.floor(total/3600), M=Math.floor((total%3600)/60), S=total%60;
      restante.innerText = `Restante: ${pad2(H)}:${pad2(M)}:${pad2(S)}`;

      const tone = restanteToneClass(diff);
      restante.classList.remove("tone-green","tone-yellow","tone-orange","tone-red","blink");
      restante.classList.add(tone);
      if (diff < 60 * 60 * 1000) restante.classList.add("blink");

      const nb = nextBeepAt.get(t.id);
      if (t.riscoAtivo && nb){
        const dnb = nb - now;
        if (dnb>0){
          const m = Math.floor(dnb/60000), s = Math.floor((dnb%60000)/1000);
          nextBeep.innerText = `Próximo beep: ${pad2(m)}:${pad2(s)}`;
        } else {
          nextBeep.innerText = `Próximo beep: 00:00`;
        }
      } else {
        nextBeep.innerText = `Próximo beep: —`;
      }

      if (!t.oneHourTriggered && diff <= 60 * 60 * 1000) {
        t.oneHourTriggered = true; salvarLocal();
        if (t.riscoAtivo){
          beepBurst(10, 180, 160, 920);
          showToast(`${t.area || "—"} • ${t.prefixo || ""} — ${t.maquinista || ""}`);
          startRepeat(t);
        }
      }
    }

    tick();
    const timer=setInterval(tick,1000); tickTimers.add(timer);
    return card;
  }

  function render(){
    for (const id of tickTimers) clearInterval(id);
    tickTimers.clear();

    const vazioC = document.getElementById("vazio-cards");
    const cargC  = document.getElementById("carregado-cards");
    if (!vazioC || !cargC) return;
    vazioC.innerHTML=""; cargC.innerHTML="";

    const F = __getFilters();
    let lista = trens.filter(t => t.area===activeArea || (!t.area && activeArea==="CORREDOR"));

    lista = lista.filter(t => __passesTypeObs(t, F));
    lista = lista.filter(t => __passesSearchFilter(t, F));

    const now = Date.now();
    if (ordenarPor){
      lista.sort((a,b)=>{
        const m = ordenarPor.value;
        if (m==="extrap_asc")       return a.extrapolacaoTs - b.extrapolacaoTs;
        if (m==="restante_asc")     return (a.extrapolacaoTs-now) - (b.extrapolacaoTs-now);
        if (m==="prefixo_az")       return (a.prefixo||"").localeCompare(b.prefixo||"","pt-BR",{numeric:true});
        if (m==="maquinista_az")    return (a.maquinista||"").localeCompare(b.maquinista||"","pt-BR",{numeric:true});
        return 0;
      });
    }

    lista.forEach(t=>{
      if (typeof t.riscoAtivo === "undefined") t.riscoAtivo = true;
      if (typeof t.oneHourTriggered === "undefined") t.oneHourTriggered = false;
      const c = criarCard(t);
      (t.tipo==="carregado" ? cargC : vazioC).appendChild(c);
    });

    updateBanner();
  }

  function carregarParaEdicao(id){
    const t = trens.find(x=>x.id===id);
    if (!t) return;
    const maq = document.getElementById("maquinista"); if (maq) maq.value = t.maquinista || "";
    const aux = document.getElementById("auxiliar");   if (aux) aux.value = t.auxiliar || "";
    const px  = document.getElementById("prefixo");    if (px)  px.value  = t.prefixo || "";
    const hr  = document.getElementById("horario");    if (hr)  hr.value  = t.horario || "";
    const ini = document.getElementById("inicio");     if (ini) ini.value = t.inicio || "";
    const tp  = document.getElementById("tipo");       if (tp)  tp.value  = t.tipo || "vazio";
    const obs = document.getElementById("obs");        if (obs) obs.value = t.obs || "";
    editandoId = id;
    const btnCad = document.getElementById("cadastrar"); if (btnCad) btnCad.innerText="Salvar Trem";
  }

  const btnCadastrar = document.getElementById("cadastrar");
  btnCadastrar?.addEventListener("click", ()=>{
    const maquinista = (document.getElementById("maquinista")?.value || "").trim();
    const auxiliar   = (document.getElementById("auxiliar")?.value || "").trim();
    const prefixo    = (document.getElementById("prefixo")?.value || "").trim();
    const horario    = (document.getElementById("horario")?.value || "");
    const inicio     = (document.getElementById("inicio")?.value || "");
    const tipo       = (document.getElementById("tipo")?.value || "vazio");
    const obs        = (document.getElementById("obs")?.value || "").trim();
    if (!maquinista || !prefixo || !inicio) return;

    const extrapDate = calcularExtrapolacaoPrecisao(inicio);
    const registro = {
      id: editandoId || (Date.now() + Math.random().toString(16).slice(2)),
      area: activeArea,
      maquinista, auxiliar, prefixo, horario, inicio, tipo, obs,
      extrapolacaoHHMM: hhmm(extrapDate),
      extrapolacaoTs: +targetDateFromHHMM(hhmm(extrapDate)),
      createdAt: Date.now(),
      riscoAtivo: true,
      oneHourTriggered: false
    };

    if (editandoId){
      const ix = trens.findIndex(t=>t.id===editandoId);
      if (ix>=0) trens[ix]=registro;
      editandoId=null;
    } else {
      trens.push(registro);
    }
    salvarLocal(); render();
  });

  document.getElementById("limpar-area")?.addEventListener("click", async ()=>{
    const ok = await confirmModal(`Limpar todos os trens da área ${activeArea}?`, { okText: "Limpar" });
    if (!ok) return;
    trens.filter(t=>t.area===activeArea).forEach(t=>{ stopRepeat(t.id); });
    trens = trens.filter(t=>t.area!==activeArea);
    salvarLocal(); render();
  });

  render();
  ensureJustifyCTA();
  updateJustifyCTA();
});


/* ===========================
   JUSTIFICATIVAS (persistência)
   =========================== */
const JUSTIF_KEY = "extrap_justif_pendentes";
const JUSTIF_FIN_KEY = "extrap_justif_finalizadas";

function getPendentes(){ try { return JSON.parse(localStorage.getItem(JUSTIF_KEY)||"[]"); } catch { return []; } }
function setPendentes(arr){ localStorage.setItem(JUSTIF_KEY, JSON.stringify(arr)); }
function pushFinalizada(item, motivo){
  const fin = JSON.parse(localStorage.getItem(JUSTIF_FIN_KEY)||"[]");
  const registradoPor = getLoggedUserName();              // <<<<<< pega o nome do usuário logado
  fin.push({ ...item, motivo, fechadoEm: Date.now(), registradoPor: registradoPor || null });
  localStorage.setItem(JUSTIF_FIN_KEY, JSON.stringify(fin));
}

// CTA flutuante
function ensureJustifyCTA(){
  if (document.getElementById("justify-cta")) return;
  const btn = document.createElement("button");
  btn.id = "justify-cta";
  btn.className = "justify-cta";
  btn.innerHTML = `<strong>Justificar Extrapolações</strong> <span id="justify-count"></span>`;
  btn.addEventListener("click", openJustifyFlow);
  document.body.appendChild(btn);
}
function updateJustifyCTA(){
  const n = getPendentes().length;
  const btn = document.getElementById("justify-cta");
  if (!btn){
    if (n>0) ensureJustifyCTA();
    return;
  }
  const badge = btn.querySelector("#justify-count");
  if (badge) badge.textContent = n ? `(${n})` : "";
  btn.style.display = n ? "block" : "none";
}

// Registra pendência a partir de um trem extrapolado
function cceRegisterExtrapFromTrain(t){
  const arr = getPendentes();
  if (arr.some(x => x.id === t.id)) { updateJustifyCTA(); return; } // evita duplicar
  const item = {
    id: t.id,
    ts: Date.now(),
    minutos: Math.max(0, Math.round((Date.now() - (t.extrapolacaoTs||Date.now()))/60000)),
    area: t.area || "",
    prefixo: t.prefixo || "",
    maquinista: t.maquinista || "",
    obs: t.obs || ""
  };
  arr.push(item);
  setPendentes(arr);
  ensureJustifyCTA();
  updateJustifyCTA();
}

// Fluxo usando o modal do Portal
async function openJustifyFlow(){
  let pend = getPendentes();
  if (!pend.length){ updateJustifyCTA(); return; }

  let enviados = 0;
  for (const it of [...pend]){
    const intro = `
      <div><strong>Extrapolação de ${it.minutos} min</strong><br>
      ${it.area || "—"} • <strong>${it.prefixo || ""}</strong> — ${it.maquinista || ""}</div>
    `;
    const motivo = await promptModal({
      title: "Justificativa de extrapolação",
      introHTML: intro,
      okText: "Enviar",
      cancelText: "Cancelar",
      placeholder: "Descreva o motivo…"
    });
    if (motivo === null) continue; // cancelou → mantém pendente
    pushFinalizada(it, motivo.trim());
    pend = pend.filter(x => x.id !== it.id);
    setPendentes(pend);
    enviados++;
  }
  updateJustifyCTA();
  if (enviados > 0) alertModal("Justificativas registradas.", { okText: "OK" });
}


/* =========================================
   PATCH: Cálculo de extrapolação (âncoras)
   ========================================= */
function parseHHMM(s){const [h,m]=s.split(":").map(x=>parseInt(x,10));return{h,m,minutes:h*60+m};}
function toHHMM(totalMin){totalMin=((totalMin%(24*60))+(24*60))%(24*60);const h=Math.floor(totalMin/60),m=Math.round(totalMin%60);return (h+"").padStart(2,"0")+":"+(m+"").padStart(2,"0");}
function isNight(min){const t=((min%(24*60))+(24*60))%(24*60);return (t>=22*60)||(t<5*60);}
const FATOR_NOTURNO_ANCHOR = 1.43;
function computeExtrapTime(startHHMM){
  const start=parseHHMM(startHHMM).minutes;const TARGET=10*60;let t=0,weighted=0;
  while(weighted<TARGET&&t<=24*60){const cur=(start+t)%(24*60);weighted+=isNight(cur)?FATOR_NOTURNO_ANCHOR:1;t+=1;}
  const extrapMin=(start+t)%(24*60);const estouraMin=(start+12*60)%(24*60);
  return{extrapola:toHHMM(extrapMin),estoura:toHHMM(estouraMin)};
}
function runAnchors(){const A=[["22:00","07:00","10:00"],["00:00","09:17","12:00"],["21:30","06:18","09:30"],["23:40","08:54","11:40"],["19:50","04:51","07:50"]];return A.map(([s,ex,st])=>{const r=computeExtrapTime(s);return{start:s,expect_ex:ex,got_ex:r.extrapola,expect_st:st,got_st:r.estoura,ok:(ex===r.extrapola&&st===r.estoura)};});}
window.__extrap_compute__=computeExtrapTime; window.__extrap_run_anchors__=runAnchors;
