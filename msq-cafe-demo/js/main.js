(() => {
  "use strict";

  const config = window.MSQ_CONFIG;
  const body = document.body;
  let toastTimer;

  function formatPrice(value) {
    return `${config.currency}${Number(value).toFixed(2)}`;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }

  function getItem(itemId) {
    return window.MSQ_DATA.items.find(item => item.id === itemId);
  }

  function toast(message) {
    const region = document.querySelector("[data-toast]");
    if (!region) return;
    window.clearTimeout(toastTimer);
    region.textContent = message;
    region.classList.add("is-visible");
    toastTimer = window.setTimeout(() => region.classList.remove("is-visible"), 2800);
  }

  function syncBodyLock() {
    body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]")));
  }

  function openDialog(dialog, trigger) {
    if (!dialog || dialog.open) return;
    dialog.__returnFocus = trigger || document.activeElement;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    syncBodyLock();
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    if (typeof dialog.close === "function") dialog.close();
    else {
      dialog.removeAttribute("open");
      dialog.dispatchEvent(new Event("close"));
    }
    syncBodyLock();
  }

  document.addEventListener("close", event => {
    if (!(event.target instanceof HTMLDialogElement)) return;
    syncBodyLock();
    window.setTimeout(() => {
      if (document.querySelector("dialog[open]")) return;
      const target = event.target.__returnFocus;
      if (target && target.isConnected && typeof target.focus === "function") target.focus({ preventScroll: true });
    }, 0);
  }, true);

  // Sticky header and mobile navigation.
  const header = document.querySelector("[data-site-header]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const mobileMenu = document.getElementById("mobile-menu");

  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  }

  function setMobileMenu(open, returnFocus = false) {
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    navToggle.querySelector("use").setAttribute("href", open ? "#i-close" : "#i-menu");
    mobileMenu.hidden = !open;
    if (!open && returnFocus) navToggle.focus();
  }

  navToggle.addEventListener("click", () => {
    setMobileMenu(navToggle.getAttribute("aria-expanded") !== "true");
  });

  mobileMenu.addEventListener("click", event => {
    if (event.target.closest("a")) setMobileMenu(false);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
      setMobileMenu(false, true);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1020 && navToggle.getAttribute("aria-expanded") === "true") setMobileMenu(false);
  });
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  // Order CTAs lead to the menu when empty and the cart when it has items.
  document.querySelectorAll("[data-order-now]").forEach(button => {
    button.addEventListener("click", () => {
      setMobileMenu(false);
      if (window.MSQCart && window.MSQCart.getCount() > 0) {
        window.MSQCart.open(button);
      } else {
        document.getElementById("menu").scrollIntoView({ behavior: "smooth", block: "start" });
        toast("Choose a sample dish to begin your demo order.");
      }
    });
  });

  // Configurable, deliberately non-live contact placeholders.
  document.querySelectorAll("[data-research-phone]").forEach(element => { element.textContent = config.contact.researchPhone; });
  document.querySelectorAll("[data-contact-address]").forEach(element => { element.textContent = config.contact.address; });
  document.querySelectorAll("[data-contact-hours]").forEach(element => { element.textContent = config.contact.openingHours; });
  document.querySelectorAll("[data-current-year]").forEach(element => { element.textContent = new Date().getFullYear(); });

  // Scroll reveals are optional; content remains visible without JavaScript or an observer.
  const revealElements = [...document.querySelectorAll("[data-reveal]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach(element => element.classList.add("is-visible"));
  } else {
    body.classList.add("reveal-ready");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px" });
    revealElements.forEach(element => observer.observe(element));
  }

  window.MSQ = window.MSQ || {};
  window.MSQ.utils = { formatPrice, escapeHTML, getItem, toast, openDialog, closeDialog, syncBodyLock };
})();
