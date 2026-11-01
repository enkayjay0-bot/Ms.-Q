/* Optional development tests. The website itself has no dependencies or build step. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const mime = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8"
};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end("Forbidden"); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404).end("Not found"); return; }
    response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(response);
  });
});

let passed = 0;
function check(value, label) {
  assert(value, label);
  console.log("PASS:", label);
  passed++;
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    // Responsive rendering, runtime errors and asset requests.
    for (const viewport of [
      { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 },
      { width: 1024, height: 768 }, { width: 1440, height: 1000 }
    ]) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = [], failed = [], external = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("requestfailed", request => failed.push(request.url()));
      page.on("request", request => { if (!request.url().startsWith(base) && !request.url().startsWith("data:")) external.push(request.url()); });
      const response = await page.goto(base, { waitUntil: "networkidle" });
      check(response.status() === 200, `homepage loads at ${viewport.width}px`);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no horizontal overflow at ${viewport.width}px`);
      check(errors.length === 0 && failed.length === 0 && external.length === 0, `clean runtime and local-only assets at ${viewport.width}px`);
      await context.close();
    }

    // Hero carousel controls, stable geometry, keyboard input and reduced motion.
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
      const page = await context.newPage();
      await page.goto(base, { waitUntil: "networkidle" });
      const carousel = "[data-hero-carousel]";
      check(await page.locator("[data-hero-slide]").count() === 4, "hero carousel renders four slides");
      check(await page.locator("[data-carousel-slide]").count() === 4 && await page.locator('[data-carousel-slide][aria-current="true"]').count() === 1, "four slide indicators expose one current slide");
      check(await page.locator('[data-hero-slide][aria-hidden="false"]').count() === 1, "exactly one carousel slide is exposed to assistive technology");
      const before = await page.locator("[data-hero-slides]").boundingBox();
      await page.click("[data-carousel-next]");
      await page.waitForFunction(() => {
        const active = document.querySelector('[data-hero-slide="1"]');
        return document.querySelector('[data-hero-carousel]').dataset.activeSlide === "1" && getComputedStyle(active).opacity === "1" && getComputedStyle(active).visibility === "visible";
      });
      check(await page.textContent("[data-carousel-counter]") === "02 / 04", "next control advances the hero carousel");
      const after = await page.locator("[data-hero-slides]").boundingBox();
      check(Math.round(before.width) === Math.round(after.width) && Math.round(before.height) === Math.round(after.height), "carousel slide changes preserve the frame dimensions");
      await page.click("[data-carousel-prev]");
      check(await page.textContent("[data-carousel-counter]") === "01 / 04", "previous control returns to the first slide");
      await page.click('[data-carousel-slide="2"]');
      check(await page.textContent("[data-carousel-counter]") === "03 / 04" && await page.getAttribute('[data-carousel-slide="2"]', "aria-current") === "true", "slide indicator selects and identifies its slide");
      await page.focus(carousel);
      await page.keyboard.press("ArrowRight");
      check(await page.textContent("[data-carousel-counter]") === "04 / 04", "carousel keyboard navigation works");
      check(await page.locator("[data-hero-slide] img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), "all four eager-loading carousel images decode");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.reload({ waitUntil: "networkidle" });
      check(await page.locator("[data-hero-slide]").first().evaluate(slide => getComputedStyle(slide).transitionDuration === "0s"), "reduced motion disables carousel transitions");
      await page.click("[data-carousel-next]");
      check(await page.textContent("[data-carousel-counter]") === "02 / 04" && await page.locator('[data-hero-slide="1"]').evaluate(slide => getComputedStyle(slide).opacity === "1"), "reduced-motion slide change is immediate and visible");
      await context.close();
    }

    // Menu, cart persistence and calculations.
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
      const page = await context.newPage();
      const networkMethods = [];
      page.on("request", request => { if (request.method() !== "GET") networkMethods.push(`${request.method()} ${request.url()}`); });
      await page.goto(base, { waitUntil: "networkidle" });
      check(await page.locator("[data-featured-grid] .food-card").count() === 4, "four featured sample dishes render");
      check(await page.locator("[data-featured-grid]").evaluate(grid => getComputedStyle(grid).display === "grid" && grid.scrollWidth <= grid.clientWidth), "featured dishes retain the desktop grid without forced horizontal scrolling");
      check(await page.locator("[data-menu-grid] .food-card").count() === 10, "ten full-menu sample dishes render");
      check(await page.locator(".gallery-card").count() === 6, "six gallery images render");
      check(await page.evaluate(() => window.MSQ_CONFIG.demoMode && !window.MSQ_CONFIG.whatsapp.enabled && !window.MSQ_CONFIG.whatsapp.authorizedNumber), "demo configuration blocks authorized ordering by default");
      check(await page.locator('a[href*="wa.me"], a[href*="whatsapp.com"]').count() === 0, "no live WhatsApp links exist in demo mode");
      check(await page.evaluate(async () => {
        const sources = new Set();
        window.MSQ_DATA.items.forEach(item => { sources.add(item.image); sources.add(item.fullImage); });
        window.MSQ_DATA.gallery.forEach(item => { sources.add(item.thumb); sources.add(item.src); });
        const results = await Promise.all([...sources].map(source => new Promise(resolve => {
          const image = new Image(); image.onload = () => resolve(image.naturalWidth > 0); image.onerror = () => resolve(false); image.src = source;
        })));
        return results.every(Boolean);
      }), "all menu and gallery WebP images load and decode");

      await page.click('[data-category="local"]');
      check(await page.locator("[data-menu-grid] .food-card").count() === 2, "Local Dishes filter returns two items");
      await page.click('[data-category="drinks"]');
      check(await page.locator("[data-menu-grid] .food-card").count() === 1, "Drinks filter returns one item");
      await page.fill("[data-menu-search]", "no-such-dish");
      check(await page.locator("[data-menu-empty]").isVisible(), "empty search state appears");
      await page.click("[data-menu-reset]");
      check(await page.locator("[data-menu-grid] .food-card").count() === 10, "reset restores all menu items");
      await page.fill("[data-menu-search]", "pasta");
      check(await page.locator("[data-menu-grid] .food-card").count() === 1, "search finds the matching pasta dish");
      await page.click("[data-search-clear]");
      check(await page.locator("[data-menu-grid] .food-card").count() === 10, "clear search restores all items");

      await page.click('[data-featured-grid] [data-add-item="jollof-chicken"]');
      await page.click('[data-category="local"]');
      await page.click('[data-menu-grid] [data-add-item="tilapia-banku"]');
      await page.click('[data-menu-grid] [data-add-item="tilapia-banku"]');
      check(await page.textContent("[data-cart-count]") === "3", "cart count reflects three items");
      await page.click(".cart-trigger");
      check(await page.locator("[data-cart-line]").count() === 2, "cart groups identical products into two lines");
      check(await page.textContent("[data-cart-total]") === "GH₵258.00", "cart total calculates GH₵258.00 correctly");
      await page.click('[data-cart-action="increase"][data-item-id="jollof-chicken"]');
      check(await page.textContent("[data-cart-total]") === "GH₵326.00", "increasing quantity updates subtotal and total");
      await page.click('[data-cart-action="decrease"][data-item-id="jollof-chicken"]');
      check(await page.textContent("[data-cart-total]") === "GH₵258.00", "decreasing quantity restores the correct total");
      await page.click('[data-cart-action="remove"][data-item-id="tilapia-banku"]');
      check(await page.locator("[data-cart-line]").count() === 1 && await page.textContent("[data-cart-total]") === "GH₵68.00", "removing a product updates lines and total");
      await page.click("[data-cart-close]");
      await page.reload({ waitUntil: "networkidle" });
      check(await page.textContent("[data-cart-count]") === "1", "cart item IDs and quantities persist locally after reload");
      await page.click(".cart-trigger");
      await page.click("[data-cart-clear]");
      check(await page.locator("[data-cart-empty]").isVisible() && await page.locator("[data-cart-footer]").isHidden(), "clear cart restores the empty state");
      await page.click("[data-cart-close]");
      await page.reload({ waitUntil: "networkidle" });

      // Checkout validation, local message generation and copy.
      await page.click('[data-featured-grid] [data-add-item="jollof-chicken"]');
      await page.fill("[data-menu-search]", "croissant");
      await page.click('[data-menu-grid] [data-add-item="butter-croissant"]');
      await page.click('[data-menu-grid] [data-add-item="butter-croissant"]');
      await page.click(".cart-trigger");
      check(await page.textContent("[data-cart-total]") === "GH₵124.00", "checkout fixture total is GH₵124.00");
      await page.click("[data-cart-checkout]");
      check(await page.locator("#checkout-dialog").evaluate(dialog => dialog.open), "checkout opens from the cart");
      check(await page.locator("[data-checkout-summary] .summary-line").count() === 2, "checkout summary contains both order lines");
      await page.click('#checkout-form button[type="submit"]');
      check((await page.textContent("#name-error")).length > 0 && (await page.textContent("#phone-error")).length > 0, "checkout validates required name and phone");
      await page.fill("#customer-name", "Ama Demo");
      await page.fill("#customer-phone", "024 000 0000");
      await page.check('input[name="order-type"][value="Delivery"]');
      await page.click('#checkout-form button[type="submit"]');
      check((await page.textContent("#delivery-error")).length > 0, "delivery requires a location");
      await page.fill("#delivery-location", "Fictional Demo Location");
      await page.fill("#order-instructions", "Sample instruction only");
      await page.click('#checkout-form button[type="submit"]');
      check(await page.locator("[data-order-preview]").isVisible(), "valid checkout generates the local preview");
      const message = await page.inputValue("[data-order-message]");
      check(message.includes("Ama Demo") && message.includes("024 000 0000") && message.includes("Delivery") && message.includes("Fictional Demo Location"), "order message contains customer and delivery details");
      check(message.includes("Jollof & grilled chicken") && message.includes("2 × GH₵28.00") && message.includes("DEMO TOTAL: GH₵124.00"), "order message contains items, quantities, prices and total");
      check(message.includes("NOT SENT") && message.includes("illustrative") && message.includes("No payment has been made"), "order message retains demo and no-payment safeguards");
      check(await page.locator("[data-whatsapp-link]").isHidden() && await page.locator("[data-whatsapp-link]").getAttribute("href") === null, "generated preview has no active WhatsApp action");
      check(networkMethods.length === 0, "checkout makes no POST or other transmitting request");
      await page.click("[data-copy-order]");
      check((await page.evaluate(() => navigator.clipboard.readText())) === message, "copy button copies the complete demo message");
      await page.click("[data-edit-order]");
      check(await page.locator("[data-checkout-form-view]").isVisible(), "edit details returns to the checkout form");
      await page.click('#checkout-form button[type="submit"]');
      await page.click("[data-finish-demo]");
      check(await page.textContent("[data-cart-count]") === "0" && !(await page.locator("#checkout-dialog").evaluate(dialog => dialog.open)), "finishing the demo clears the cart and closes checkout");

      // Gallery keyboard controls and focus restoration.
      await page.click('[data-gallery-index="0"]');
      check(await page.locator("#gallery-lightbox").evaluate(dialog => dialog.open), "gallery lightbox opens");
      await page.keyboard.press("ArrowRight");
      check(await page.textContent("[data-lightbox-counter]") === "02 / 06", "gallery right arrow advances");
      await page.keyboard.press("ArrowLeft");
      check(await page.textContent("[data-lightbox-counter]") === "01 / 06", "gallery left arrow returns");
      await page.click("[data-lightbox-prev]");
      check(await page.textContent("[data-lightbox-counter]") === "06 / 06", "gallery previous wraps to the last image");
      await page.click("[data-lightbox-next]");
      check(await page.textContent("[data-lightbox-counter]") === "01 / 06", "gallery next wraps to the first image");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement === document.querySelector('[data-gallery-index="0"]'));
      check(true, "gallery Escape closes and restores focus");
      await context.close();
    }

    // Mobile navigation, cart access and touch gallery.
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto(base, { waitUntil: "networkidle" });
      check(await page.locator("[data-featured-grid]").evaluate(grid => getComputedStyle(grid).scrollSnapType.includes("mandatory") && grid.scrollWidth > grid.clientWidth), "mobile featured dishes use an intentional horizontal scroll-snap rail");
      await page.click("[data-nav-toggle]");
      check(await page.getAttribute("[data-nav-toggle]", "aria-expanded") === "true" && await page.locator("#mobile-menu").isVisible(), "mobile navigation opens accessibly");
      await page.keyboard.press("Escape");
      check(await page.getAttribute("[data-nav-toggle]", "aria-expanded") === "false" && await page.locator("[data-nav-toggle]").evaluate(button => button === document.activeElement), "mobile Escape closes navigation and restores focus");
      await page.click("[data-nav-toggle]");
      await page.click('#mobile-menu a[href="#menu"]');
      check(await page.getAttribute("[data-nav-toggle]", "aria-expanded") === "false" && page.url().endsWith("#menu"), "mobile menu link closes and navigates");
      await page.click('[data-menu-grid] [data-add-item="jollof-chicken"]');
      await page.click(".cart-trigger");
      check(await page.locator("#cart-dialog").evaluate(dialog => dialog.open) && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mobile cart opens without horizontal overflow");
      await page.click("[data-cart-close]");
      await page.locator("[data-hero-slides]").evaluate(stage => {
        const start = new Touch({ identifier: 2, target: stage, clientX: 300, clientY: 350 });
        stage.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [start], changedTouches: [start] }));
        const end = new Touch({ identifier: 2, target: stage, clientX: 100, clientY: 350 });
        stage.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [end] }));
      });
      check(await page.textContent("[data-carousel-counter]") === "02 / 04", "mobile swipe advances the hero carousel");
      await page.click('[data-gallery-index="0"]');
      await page.locator("[data-lightbox-stage]").evaluate(stage => {
        const start = new Touch({ identifier: 1, target: stage, clientX: 300, clientY: 350 });
        stage.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [start], changedTouches: [start] }));
        const end = new Touch({ identifier: 1, target: stage, clientX: 100, clientY: 350 });
        stage.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [end] }));
      });
      check(await page.textContent("[data-lightbox-counter]") === "02 / 06", "mobile swipe advances the gallery");
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mobile lightbox has no horizontal overflow");
      await context.close();
    }

    // Automated accessibility checks in the main UI states.
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto(base, { waitUntil: "networkidle" });
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      async function axeCheck(label) {
        const results = await page.evaluate(async () => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
        if (results.violations.length) console.log(JSON.stringify(results.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })), null, 2));
        check(results.violations.length === 0, label);
      }
      await axeCheck("homepage passes automated axe WCAG A/AA scan");
      await page.click('[data-featured-grid] [data-add-item="jollof-chicken"]');
      await page.click(".cart-trigger");
      await axeCheck("cart drawer passes automated axe WCAG A/AA scan");
      await page.click("[data-cart-checkout]");
      await axeCheck("checkout dialog passes automated axe WCAG A/AA scan");
      await page.click("[data-checkout-close]");
      await page.click('[data-gallery-index="0"]');
      await axeCheck("gallery lightbox passes automated axe WCAG A/AA scan");
      await context.close();
    }

    // Content remains honest and visible without JavaScript.
    {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(base);
      check(await page.locator("h1").isVisible(), "hero content remains visible without JavaScript");
      check(await page.locator(".hero-image-wrap img").isVisible() && await page.locator(".carousel-controls").isHidden(), "no-JavaScript hero keeps its fallback image and hides unavailable carousel controls");
      check(await page.locator(".noscript-banner").isVisible(), "no-JavaScript notice explains interactive limitations");
      check(await page.locator('a[href*="wa.me"], a[href*="whatsapp.com"]').count() === 0, "no-JavaScript state also has no live ordering link");
      await context.close();
    }

    console.log(`\nALL BROWSER TESTS PASSED: ${passed}`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  server.close();
  process.exit(1);
});
