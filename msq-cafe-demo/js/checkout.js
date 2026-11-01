(() => {
  "use strict";

  const config = window.MSQ_CONFIG;
  const { formatPrice, toast, openDialog, closeDialog } = window.MSQ.utils;
  const dialog = document.getElementById("checkout-dialog");
  const form = document.getElementById("checkout-form");
  const formView = dialog.querySelector("[data-checkout-form-view]");
  const preview = dialog.querySelector("[data-order-preview]");
  const summary = dialog.querySelector("[data-checkout-summary]");
  const totalElement = dialog.querySelector("[data-checkout-total]");
  const deliveryField = dialog.querySelector("[data-delivery-field]");
  const deliveryInput = document.getElementById("delivery-location");
  const messageBox = dialog.querySelector("[data-order-message]");
  const whatsappLink = dialog.querySelector("[data-whatsapp-link]");
  const safetyNote = dialog.querySelector("[data-demo-safety-note]");

  function renderSummary() {
    const lines = window.MSQCart.getLines();
    summary.innerHTML = lines.map(({ item, quantity, subtotal }) => `
      <div class="summary-line"><span>${quantity}×</span><span>${window.MSQ.utils.escapeHTML(item.name)}</span><strong>${formatPrice(subtotal)}</strong></div>`).join("");
    totalElement.textContent = formatPrice(window.MSQCart.getTotal());
  }

  function showForm() {
    preview.hidden = true;
    formView.hidden = false;
    renderSummary();
  }

  function open(trigger) {
    if (!window.MSQCart.getCount()) {
      toast("Your demo cart is empty.");
      return;
    }
    showForm();
    openDialog(dialog, trigger);
    dialog.scrollTop = 0;
  }

  function selectedOrderType() {
    return form.querySelector('input[name="order-type"]:checked').value;
  }

  function updateDeliveryField() {
    const delivery = selectedOrderType() === "Delivery";
    deliveryField.hidden = !delivery;
    deliveryInput.required = delivery;
    if (!delivery) setError(deliveryInput, "delivery-error", "");
  }

  function setError(input, errorId, message) {
    document.getElementById(errorId).textContent = message;
    input.setAttribute("aria-invalid", String(Boolean(message)));
  }

  function validate() {
    const nameInput = document.getElementById("customer-name");
    const phoneInput = document.getElementById("customer-phone");
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const digits = phone.replace(/\D/g, "");
    let valid = true;

    setError(nameInput, "name-error", name.length >= 2 ? "" : "Enter a demo name with at least 2 characters.");
    setError(phoneInput, "phone-error", digits.length >= 7 && digits.length <= 15 && /^\+?[\d\s()/-]+$/.test(phone) ? "" : "Enter a valid demo phone number (7–15 digits).");
    setError(deliveryInput, "delivery-error", selectedOrderType() !== "Delivery" || deliveryInput.value.trim().length >= 3 ? "" : "Enter a fictional delivery location for this demo.");

    [nameInput, phoneInput, deliveryInput].forEach(input => {
      if (input.getAttribute("aria-invalid") === "true") valid = false;
    });
    if (!valid) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
    }
    return valid;
  }

  function buildMessage() {
    const name = document.getElementById("customer-name").value.trim();
    const phone = document.getElementById("customer-phone").value.trim();
    const orderType = selectedOrderType();
    const location = deliveryInput.value.trim();
    const instructions = document.getElementById("order-instructions").value.trim();
    const lines = window.MSQCart.getLines();
    const itemLines = lines.map(({ item, quantity, subtotal }, index) =>
      `${index + 1}. ${item.name}\n   ${quantity} × ${formatPrice(item.price)} = ${formatPrice(subtotal)}`
    ).join("\n\n");

    return [
      "MS. Q CAFE & RESTAURANT — INDEPENDENT CONCEPT DEMO",
      "DEMONSTRATION ORDER — NOT SENT",
      "All dishes and prices are illustrative.",
      "",
      "CUSTOMER DETAILS (DEMO)",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Order type: ${orderType}`,
      ...(orderType === "Delivery" ? [`Delivery location: ${location}`] : []),
      `Additional instructions: ${instructions || "None"}`,
      "",
      "SAMPLE ORDER",
      itemLines,
      "",
      `DEMO TOTAL: ${formatPrice(window.MSQCart.getTotal())}`,
      "",
      "No payment has been made. No order has been transmitted.",
      "Generated locally by an Enkayjay Digital Solutions concept demo."
    ].join("\n");
  }

  function configureWhatsApp(message) {
    const authorizedNumber = String(config.whatsapp.authorizedNumber || "").replace(/\D/g, "");
    const active = config.demoMode === false && config.whatsapp.enabled === true && /^\d{10,15}$/.test(authorizedNumber);
    if (active) {
      whatsappLink.hidden = false;
      whatsappLink.href = `https://wa.me/${authorizedNumber}?text=${encodeURIComponent(message)}`;
      safetyNote.textContent = "Authorized WhatsApp ordering is enabled by configuration.";
    } else {
      whatsappLink.hidden = true;
      whatsappLink.removeAttribute("href");
      safetyNote.textContent = "Real WhatsApp ordering is disabled in demo mode.";
    }
  }

  async function copyMessage() {
    const text = messageBox.value;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      toast("Demo order message copied. Nothing was sent.");
    } catch (_) {
      messageBox.focus();
      messageBox.select();
      const copied = document.execCommand("copy");
      toast(copied ? "Demo order message copied. Nothing was sent." : "Select the message and copy it manually.");
    }
  }

  document.addEventListener("msq:open-checkout", event => open(event.detail.trigger));
  document.addEventListener("msq:cart-updated", () => { if (dialog.open && !formView.hidden) renderSummary(); });
  form.querySelectorAll('input[name="order-type"]').forEach(input => input.addEventListener("change", updateDeliveryField));
  form.querySelectorAll("input, textarea").forEach(input => input.addEventListener("input", () => {
    if (input.id === "customer-name") setError(input, "name-error", "");
    if (input.id === "customer-phone") setError(input, "phone-error", "");
    if (input.id === "delivery-location") setError(input, "delivery-error", "");
  }));

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!validate() || !window.MSQCart.getCount()) return;
    const message = buildMessage();
    messageBox.value = message;
    configureWhatsApp(message);
    formView.hidden = true;
    preview.hidden = false;
    dialog.scrollTop = 0;
    messageBox.focus();
  });

  dialog.querySelector("[data-checkout-close]").addEventListener("click", () => closeDialog(dialog));
  dialog.querySelector("[data-copy-order]").addEventListener("click", copyMessage);
  dialog.querySelector("[data-edit-order]").addEventListener("click", () => {
    showForm();
    document.getElementById("customer-name").focus();
  });
  dialog.querySelector("[data-finish-demo]").addEventListener("click", () => {
    window.MSQCart.clear();
    form.reset();
    updateDeliveryField();
    showForm();
    closeDialog(dialog);
    toast("Demo order cleared. Nothing was sent.");
  });

  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
  });

  whatsappLink.addEventListener("click", event => {
    if (config.demoMode || !config.whatsapp.enabled) {
      event.preventDefault();
      toast("Demo mode: real WhatsApp ordering is disabled.");
    }
  });

  updateDeliveryField();
  configureWhatsApp("");
})();
