(() => {
  "use strict";

  const { items, categories } = window.MSQ_DATA;
  const { formatPrice, escapeHTML } = window.MSQ.utils;
  const categoryNames = Object.fromEntries(categories.map(category => [category.id, category.label]));
  const menuGrid = document.querySelector("[data-menu-grid]");
  const featuredGrid = document.querySelector("[data-featured-grid]");
  const searchInput = document.querySelector("[data-menu-search]");
  const searchClear = document.querySelector("[data-search-clear]");
  const resultCount = document.querySelector("[data-menu-count]");
  const emptyState = document.querySelector("[data-menu-empty]");
  const categoryRail = document.querySelector("[data-category-rail]");
  let activeCategory = "all";

  function foodCard(item, index) {
    const width = item.portrait ? 580 : 720;
    const height = item.portrait ? 720 : 538;
    return `
      <article class="food-card" style="--card-index: ${index}" data-food-card="${escapeHTML(item.id)}">
        <div class="food-card-image">
          <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.alt)}" width="${width}" height="${height}" loading="lazy" decoding="async">
          <span class="food-card-badge">Sample dish</span>
        </div>
        <div class="food-card-body">
          <p class="food-card-category">${escapeHTML(categoryNames[item.category])}</p>
          <h3>${escapeHTML(item.name)}</h3>
          <p class="food-card-description">${escapeHTML(item.description)}</p>
          <div class="food-card-footer">
            <span class="food-price"><small>Demo price</small>${formatPrice(item.price)}</span>
            <button class="add-to-cart" type="button" data-add-item="${escapeHTML(item.id)}" aria-label="Add to Cart: ${escapeHTML(item.name)} (demo)">
              <svg class="icon" aria-hidden="true"><use href="#i-cart"/></svg><span>Add to Cart</span>
            </button>
          </div>
        </div>
      </article>`;
  }

  function filteredItems() {
    const query = searchInput.value.trim().toLowerCase();
    return items.filter(item => {
      const categoryMatch = activeCategory === "all" || item.category === activeCategory;
      const searchMatch = !query || `${item.name} ${item.description} ${categoryNames[item.category]}`.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });
  }

  function renderMenu() {
    const visibleItems = filteredItems();
    menuGrid.innerHTML = visibleItems.map(foodCard).join("");
    menuGrid.hidden = visibleItems.length === 0;
    emptyState.hidden = visibleItems.length !== 0;
    resultCount.textContent = `${visibleItems.length} sample item${visibleItems.length === 1 ? "" : "s"}`;
    searchClear.hidden = searchInput.value.length === 0;
  }

  featuredGrid.innerHTML = items.filter(item => item.featured).map(foodCard).join("");
  renderMenu();

  categoryRail.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    categoryRail.querySelectorAll("[data-category]").forEach(categoryButton => {
      const active = categoryButton === button;
      categoryButton.classList.toggle("is-active", active);
      categoryButton.setAttribute("aria-pressed", String(active));
    });
    renderMenu();
  });

  searchInput.addEventListener("input", renderMenu);
  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    renderMenu();
    searchInput.focus();
  });

  document.querySelector("[data-menu-reset]").addEventListener("click", () => {
    searchInput.value = "";
    activeCategory = "all";
    categoryRail.querySelectorAll("[data-category]").forEach(button => {
      const active = button.dataset.category === "all";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderMenu();
    searchInput.focus();
  });

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-add-item]");
    if (!button) return;
    const item = getItemSafe(button.dataset.addItem);
    if (!item) return;
    document.dispatchEvent(new CustomEvent("msq:add-to-cart", { detail: { itemId: item.id } }));
    window.clearTimeout(button.__resetTimer);
    if (!button.__originalContent) {
      button.__originalContent = button.innerHTML;
      button.__originalLabel = button.getAttribute("aria-label");
    }
    button.classList.add("is-added");
    button.setAttribute("aria-label", `Added ${item.name} to demo cart`);
    button.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span>Added</span>';
    button.__resetTimer = window.setTimeout(() => {
      button.classList.remove("is-added");
      button.innerHTML = button.__originalContent;
      button.setAttribute("aria-label", button.__originalLabel);
    }, 850);
  });

  function getItemSafe(itemId) {
    return items.find(item => item.id === itemId);
  }
})();
