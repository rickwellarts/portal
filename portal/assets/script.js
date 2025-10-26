document.addEventListener("DOMContentLoaded", () => {
  const btn = document.createElement("button");
  btn.id = "btn-justificar-extrap";
  btn.textContent = "Justificar Extrapolações";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#ffc107",
    color: "#111",
    border: "none",
    borderRadius: "10px",
    padding: "12px 18px",
    cursor: "pointer",
    zIndex: "2000",
    fontWeight: "600",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
  });
  document.body.appendChild(btn);

  btn.addEventListener("click", () => {
    const modal = document.getElementById("cce-modal");
    if (modal) {
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
    }
  });
});


document.addEventListener("DOMContentLoaded", () => {
  // Botão flutuante (mantém sua lógica)
  const btn = document.createElement("button");
  btn.id = "btn-justificar-extrap";
  btn.textContent = "Justificar Extrapolações";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#ffc107",
    color: "#111",
    border: "none",
    borderRadius: "10px",
    padding: "12px 18px",
    cursor: "pointer",
    zIndex: "2000",
    fontWeight: "600",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
  });
  document.body.appendChild(btn);

  const modal = document.getElementById("cce-modal");

  function openModal(){
    if (!modal) return;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }
  function closeModal(){
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  // Abrir
  btn.addEventListener("click", openModal);

  if (modal){
    // Fechar ao clicar na overlay ou no botão "Cancelar"
    modal.addEventListener("click", (e) => {
      const isOverlay = e.target.classList?.contains("modal-overlay");
      const isCancel  = e.target.closest?.('[data-action="cancelar"]');
      const isClose   = e.target.dataset?.close === "true"; // se existir
      if (isOverlay || isCancel || isClose) closeModal();
    });

    // Observa mudanças de aria-hidden vindas de outros fluxos (ex.: envio OK)
    const mo = new MutationObserver(() => {
      const aberto = modal.getAttribute("aria-hidden") === "false";
      document.body.classList.toggle("modal-open", aberto);
    });
    mo.observe(modal, { attributes: true, attributeFilter: ["aria-hidden"] });
  }
});
