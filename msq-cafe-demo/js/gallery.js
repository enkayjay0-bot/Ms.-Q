(() => {
  "use strict";

  const images = window.MSQ_DATA.gallery;
  const { escapeHTML, openDialog, closeDialog } = window.MSQ.utils;
  const grid = document.querySelector("[data-gallery-grid]");
  const dialog = document.getElementById("gallery-lightbox");
  const image = dialog.querySelector("[data-lightbox-image]");
  const caption = dialog.querySelector("[data-lightbox-caption]");
  const counter = dialog.querySelector("[data-lightbox-counter]");
  const stage = dialog.querySelector("[data-lightbox-stage]");
  let activeIndex = 0;
  let touchStart = null;

  grid.innerHTML = images.map((item, index) => `
    <button class="gallery-card" type="button" data-gallery-index="${index}" aria-label="Enlarge gallery image ${index + 1}: ${escapeHTML(item.caption)}">
      <img src="${escapeHTML(item.thumb)}" alt="${escapeHTML(item.alt)}" width="${item.portrait ? 580 : 720}" height="${item.portrait ? 720 : 538}" loading="lazy" decoding="async">
      <span class="gallery-caption"><span>${escapeHTML(item.caption)}</span><svg class="icon" aria-hidden="true"><use href="#i-arrow-up"/></svg></span>
    </button>`).join("");

  function update(index) {
    activeIndex = (index + images.length) % images.length;
    const item = images[activeIndex];
    image.src = item.src;
    image.alt = item.alt;
    image.width = item.portrait ? 928 : 1200;
    image.height = item.portrait ? 1152 : 896;
    caption.textContent = item.caption;
    counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(images.length).padStart(2, "0")}`;
    [1, -1].forEach(offset => {
      const preload = new Image();
      preload.src = images[(activeIndex + offset + images.length) % images.length].src;
    });
  }

  function open(index, trigger) {
    update(index);
    openDialog(dialog, trigger);
  }

  grid.addEventListener("click", event => {
    const button = event.target.closest("[data-gallery-index]");
    if (button) open(Number(button.dataset.galleryIndex), button);
  });
  dialog.querySelector("[data-lightbox-close]").addEventListener("click", () => closeDialog(dialog));
  dialog.querySelector("[data-lightbox-prev]").addEventListener("click", () => update(activeIndex - 1));
  dialog.querySelector("[data-lightbox-next]").addEventListener("click", () => update(activeIndex + 1));

  document.addEventListener("keydown", event => {
    if (!dialog.open) return;
    if (event.key === "ArrowRight") { event.preventDefault(); update(activeIndex + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); update(activeIndex - 1); }
  });

  stage.addEventListener("touchstart", event => {
    if (event.touches.length === 1) touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  stage.addEventListener("touchend", event => {
    if (!touchStart || !event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.25) update(activeIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
