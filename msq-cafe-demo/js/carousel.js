(() => {
  "use strict";

  const slidesData = window.MSQ_DATA.heroSlides;
  const carousel = document.querySelector("[data-hero-carousel]");
  const slidesContainer = carousel.querySelector("[data-hero-slides]");
  const indicators = carousel.querySelector("[data-carousel-indicators]");
  const caption = carousel.querySelector("[data-carousel-caption]");
  const counter = carousel.querySelector("[data-carousel-counter]");
  const announcement = carousel.querySelector("[data-carousel-announcement]");
  const { escapeHTML } = window.MSQ.utils;
  let activeIndex = 0;
  let touchStart = null;
  const responsiveSizes = "(max-width: 640px) calc(100vw - 52px), (max-width: 820px) min(546px, calc(90vw - 24px)), (max-width: 1180px) 42vw, 506px";

  slidesContainer.innerHTML = slidesData.map((slide, index) => `
    <div class="hero-slide${index === 0 ? " is-active" : ""}" data-hero-slide="${index}" role="group" aria-roledescription="slide" aria-label="${index + 1} of ${slidesData.length}" aria-hidden="${index === 0 ? "false" : "true"}">
      <img srcset="${escapeHTML(slide.cardSrc)} ${slide.portrait ? 580 : 720}w, ${escapeHTML(slide.src)} ${slide.portrait ? 928 : 1200}w" sizes="${responsiveSizes}" src="${escapeHTML(slide.src)}" alt="${escapeHTML(slide.alt)}" width="${slide.portrait ? 928 : 1200}" height="${slide.portrait ? 1152 : 896}" loading="eager" fetchpriority="${index === 0 ? "high" : "low"}" decoding="async">
    </div>`).join("");

  indicators.innerHTML = slidesData.map((slide, index) => `
    <button type="button" data-carousel-slide="${index}" aria-label="Show slide ${index + 1}: ${escapeHTML(slide.caption)}" aria-current="${index === 0 ? "true" : "false"}"><span aria-hidden="true"></span></button>`).join("");

  const slides = [...slidesContainer.querySelectorAll("[data-hero-slide]")];
  const dots = [...indicators.querySelectorAll("[data-carousel-slide]")];

  function update(index, announce = true) {
    activeIndex = (index + slidesData.length) % slidesData.length;
    const item = slidesData[activeIndex];
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === activeIndex;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });
    dots.forEach((dot, dotIndex) => dot.setAttribute("aria-current", String(dotIndex === activeIndex)));
    caption.textContent = item.caption;
    counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(slidesData.length).padStart(2, "0")}`;
    carousel.dataset.activeSlide = String(activeIndex);
    if (announce) announcement.textContent = `Slide ${activeIndex + 1} of ${slidesData.length}: ${item.caption}`;
  }

  carousel.querySelector("[data-carousel-prev]").addEventListener("click", () => update(activeIndex - 1));
  carousel.querySelector("[data-carousel-next]").addEventListener("click", () => update(activeIndex + 1));
  indicators.addEventListener("click", event => {
    const button = event.target.closest("[data-carousel-slide]");
    if (button) update(Number(button.dataset.carouselSlide));
  });

  carousel.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") { event.preventDefault(); update(activeIndex + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); update(activeIndex - 1); }
  });

  slidesContainer.addEventListener("touchstart", event => {
    if (event.touches.length === 1) touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  slidesContainer.addEventListener("touchend", event => {
    if (!touchStart || !event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.25) update(activeIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });

  carousel.classList.add("is-enhanced");
  update(0, false);
})();
