// ── Shared UI feedback helpers (replaces raw alert()/window.confirm()) ──────
// Include this file with a <script> tag BEFORE your page's own script, e.g.:
//   <script src="ui-feedback.js"></script>
//   <script src="app.js"></script>
// Exposes window.showToast(message, type) and window.showConfirm(message, opts).

(() => {
  const escapeHtml = (value = "") => {
    return String(value).replace(/[&<>"']/g, (char) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;",
      };
      return entities[char];
    });
  };

  let toastContainer = null;

  const showToast = (message, type = "info") => {
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "toast-container";
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  };

  const showConfirm = (message, options = {}) => {
    const { confirmText = "Confirm", cancelText = "Cancel" } = options;

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "confirm-modal-overlay";
      overlay.innerHTML = `
        <div class="confirm-modal-box">
          <p>${escapeHtml(message)}</p>
          <div class="confirm-modal-actions">
            <button type="button" class="confirm-modal-btn confirm-modal-btn-cancel" id="confirmModalCancelBtn">${escapeHtml(cancelText)}</button>
            <button type="button" class="confirm-modal-btn confirm-modal-btn-confirm" id="confirmModalConfirmBtn">${escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const cleanup = (result) => {
        overlay.remove();
        resolve(result);
      };

      overlay.querySelector("#confirmModalCancelBtn").addEventListener("click", () => cleanup(false));
      overlay.querySelector("#confirmModalConfirmBtn").addEventListener("click", () => cleanup(true));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cleanup(false);
      });
    });
  };

  window.showToast = showToast;
  window.showConfirm = showConfirm;
})();