(() => {
  "use strict";

  const { formatPrice, escapeHTML, getItem, toast, openDialog, closeDialog } = window.MSQ.utils;
  const storageKey = window.MSQ_CONFIG.storageKey;
  const dialog = document.getElementById("cart-dialog");
  const itemsContainer = dialog.querySelector("[data-cart-items]");
  const emptyState = dialog.querySelector("[data-cart-empty]");
  const footer = dialog.querySelector("[data-cart-footer]");
  const totalElement = dialog.querySelector("[data-cart-total]");
  let cart = loadCart();

  function loadCart() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(stored)) return [];
      return stored.map(line => ({
        itemId: String(line.itemId),
        quantity: Math.max(1, Math.min(20, Math.floor(Number(line.quantity)) || 1))
      })).filter(line => getItem(line.itemId));
    } catch (_) {
      return [];
    }
  }

  function saveCart() {
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch (_) { /* Storage is optional. */ }
  }

  function getLines() {
    return cart.map(line => {
      const item = getItem(line.itemId);
      return { ...line, item, subtotal: item.price * line.quantity };
    });
  }

  function getCount() {
    return cart.reduce((total, line) => total + line.quantity, 0);
  }

  function getTotal() {
    return getLines().reduce((total, line) => total + line.subtotal, 0);
  }

  function render() {
    const lines = getLines();
    const count = getCount();
    document.querySelectorAll("[data-cart-count]").forEach(element => {
      element.textContent = count;
      element.classList.remove("bump");
      void element.offsetWidth;
      if (count) element.classList.add("bump");
    });
    document.querySelectorAll(".cart-trigger").forEach(button => {
      button.setAttribute("aria-label", `Open demo cart, ${count} item${count === 1 ? "" : "s"}`);
    });

    itemsContainer.innerHTML = lines.map(({ item, quantity, subtotal }) => `
      <article class="cart-line" data-cart-line="${escapeHTML(item.id)}">
        <img src="${escapeHTML(item.image)}" alt="" width="720" height="538">
        <div class="cart-line-info">
          <h3>${escapeHTML(item.name)}</h3>
          <p class="cart-line-price">${formatPrice(item.price)} each · sample</p>
          <div class="quantity-control" aria-label="Quantity for ${escapeHTML(item.name)}">
            <button type="button" data-cart-action="decrease" data-item-id="${escapeHTML(item.id)}" aria-label="Decrease ${escapeHTML(item.name)} quantity" ${quantity === 1 ? "disabled" : ""}><svg class="icon"><use href="#i-minus"/></svg></button>
            <span aria-label="Quantity ${quantity}">${quantity}</span>
            <button type="button" data-cart-action="increase" data-item-id="${escapeHTML(item.id)}" aria-label="Increase ${escapeHTML(item.name)} quantity" ${quantity === 20 ? "disabled" : ""}><svg class="icon"><use href="#i-plus"/></svg></button>
          </div>
        </div>
        <div class="cart-line-side"><strong>${formatPrice(subtotal)}</strong><button class="cart-remove" type="button" data-cart-action="remove" data-item-id="${escapeHTML(item.id)}" aria-label="Remove ${escapeHTML(item.name)} from cart"><svg class="icon"><use href="#i-trash"/></svg></button></div>
      </article>`).join("");

    itemsContainer.hidden = lines.length === 0;
    emptyState.hidden = lines.length !== 0;
    footer.hidden = lines.length === 0;
    totalElement.textContent = formatPrice(getTotal());
    document.dispatchEvent(new CustomEvent("msq:cart-updated"));
  }

  function add(itemId) {
    const item = getItem(itemId);
    if (!item) return;
    const existing = cart.find(line => line.itemId === itemId);
    if (existing) existing.quantity = Math.min(20, existing.quantity + 1);
    else cart.push({ itemId, quantity: 1 });
    saveCart();
    render();
    toast(`${item.name} added to your demo cart.`);
  }

  function updateLine(itemId, action) {
    const line = cart.find(entry => entry.itemId === itemId);
    if (!line) return;
    if (action === "increase") line.quantity = Math.min(20, line.quantity + 1);
    if (action === "decrease") line.quantity = Math.max(1, line.quantity - 1);
    if (action === "remove") cart = cart.filter(entry => entry.itemId !== itemId);
    saveCart();
    render();
  }

  function clear() {
    cart = [];
    saveCart();
    render();
    toast("Demo cart cleared.");
  }

  function open(trigger) {
    render();
    openDialog(dialog, trigger);
  }

  document.addEventListener("msq:add-to-cart", event => add(event.detail.itemId));
  document.querySelectorAll("[data-cart-open]").forEach(button => button.addEventListener("click", () => open(button)));
  dialog.querySelector("[data-cart-close]").addEventListener("click", () => closeDialog(dialog));
  dialog.querySelector("[data-cart-clear]").addEventListener("click", clear);
  dialog.querySelectorAll("[data-cart-browse]").forEach(button => button.addEventListener("click", () => {
    closeDialog(dialog);
    document.getElementById("menu").scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  itemsContainer.addEventListener("click", event => {
    const button = event.target.closest("[data-cart-action]");
    if (button) updateLine(button.dataset.itemId, button.dataset.cartAction);
  });

  dialog.querySelector("[data-cart-checkout]").addEventListener("click", () => {
    if (!cart.length) return;
    closeDialog(dialog);
    document.dispatchEvent(new CustomEvent("msq:open-checkout", { detail: { trigger: document.querySelector(".cart-trigger") } }));
  });

  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
  });

  window.MSQCart = { add, open, clear, getCount, getLines, getTotal };
  render();
})();
