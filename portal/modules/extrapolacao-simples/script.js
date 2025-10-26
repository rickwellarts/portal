/* =======================
   Núcleo de cálculo
   ======================= */

// Âncoras oficiais MRS (meta = 600). Ordem circular cronológica.
const ANCHORS = [
  ["15:00", "00:37"],
  ["19:50", "04:51"],
  ["21:30", "06:18"],
  ["22:00", "07:00"],
  ["23:40", "08:54"],
  ["00:00", "09:17"],
];
const FATOR_NOTURNO = 1.43;

function parseHHMM(s){ const [h,m]=s.split(":").map(Number); return h*60+m; }
function toHHMM(totalMin){
  totalMin = ((totalMin % (24*60)) + (24*60)) % (24*60);
  const h = Math.floor(totalMin/60), m = Math.round(totalMin%60);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function isNight(min){ const t=((min%(24*60))+(24*60))%(24*60); return (t>=22*60)||(t<5*60); }

/** Interpola circularmente entre âncoras para meta=600 */
function extrapInterpolado600(startHHMM){
  const s = parseHHMM(startHHMM);

  for (let i = 0; i < ANCHORS.length; i++){
    const j = (i + 1) % ANCHORS.length;

    const s1 = parseHHMM(ANCHORS[i][0]);
    const s2 = parseHHMM(ANCHORS[j][0]);
    // intervalo [s1, s2) levando em conta virada do dia
    const inInterval = s1 <= s2 ? (s >= s1 && s < s2) : (s >= s1 || s < s2);
    if (!inInterval) continue;

    const e1 = parseHHMM(ANCHORS[i][1]);
    const e2 = parseHHMM(ANCHORS[j][1]);

    const span = s1 <= s2 ? (s2 - s1) : (24*60 - (s1 - s2));
    const dist = s1 <= s2 ? (s - s1) : (s >= s1 ? (s - s1) : (s + 24*60 - s1));
    const t = span > 0 ? dist / span : 0;

    const diffE = (e2 - e1 + 24*60) % (24*60);
    const ex = (e1 + t * diffE) % (24*60);

    return { extrapolaMin: ex };
  }

  // fallback improvável
  return { extrapolaMin: (parseHHMM(startHHMM) + 600) % (24*60) };
}

/** Simulação minuto-a-minuto para metas ≠ 600 */
function extrapPorSimulacao(startHHMM, metaMin){
  const start = parseHHMM(startHHMM);
  let t = 0;
  let econ = 0;
  while (econ < metaMin && t <= 24*60){
    const cur = (start + t) % (24*60);
    econ += isNight(cur) ? FATOR_NOTURNO : 1;
    t += 1;
  }
  return { extrapolaMin: (start + t) % (24*60) };
}

/** API pública */
function calcularExtrapolacao(hhmmInicio, metaMin=600){
  const sMin = parseHHMM(hhmmInicio);
  let exMin;
  if (metaMin === 600){
    exMin = extrapInterpolado600(hhmmInicio).extrapolaMin;
  } else {
    exMin = extrapPorSimulacao(hhmmInicio, metaMin).extrapolaMin;
  }
  const duracaoRelogio = (exMin - sMin + 24*60) % (24*60);
  return {
    extrapolacaoHHMM: toHHMM(exMin),
    duracaoMin: duracaoRelogio,
  };
}

/* =======================
   Ligações com a UI
   ======================= */
document.addEventListener("DOMContentLoaded", ()=>{
  const $hora = document.getElementById("abertura");
  const $meta = document.getElementById("meta");
  const $btnCalc = document.getElementById("btn-calcular");
  const $btnNow  = document.getElementById("btn-now");
  const $btnClr  = document.getElementById("btn-clear");

  const $outEx   = document.getElementById("out-extrap");
  const $outExSub= document.getElementById("out-extrap-sub");
  const $outDur  = document.getElementById("out-duracao");

  function render(){
    const h = ($hora?.value || "").trim();
    const m = parseInt(($meta?.value || "600"), 10) || 600;
    if (!h || !/^\d{2}:\d{2}$/.test(h)) return;

    const r = calcularExtrapolacao(h, m);

    if ($outEx)    $outEx.textContent = r.extrapolacaoHHMM;
    if ($outExSub) $outExSub.textContent = ""; // (mantenho espaço para data se quiser)
    if ($outDur) {
      const hr = Math.floor(r.duracaoMin/60), mn = r.duracaoMin%60;
      $outDur.textContent = `${String(hr).padStart(2,"0")}h${String(mn).padStart(2,"0")}m`;
    }
  }

  $btnCalc?.addEventListener("click", render);
  $hora?.addEventListener("change", render);
  $meta?.addEventListener("input", render);

  $btnNow?.addEventListener("click", ()=>{
    const d = new Date();
    $hora.value = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    render();
  });

  $btnClr?.addEventListener("click", ()=>{
    $hora.value = "";
    $meta.value = 600;
    [$outEx, $outExSub, $outDur].forEach(el => el && (el.textContent = el.id === "out-duracao" ? "--h--m" : "--:--"));
  });

  // se já veio preenchido, calcula
  render();
});

// para testes no console
window.__calcSimples = { calcularExtrapolacao };
