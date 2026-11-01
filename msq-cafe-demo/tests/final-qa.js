/* Independent release QA. Development-only; the website itself has no dependencies. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const resultPath = path.join(__dirname, "final-qa-results.json");
const mime = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8"
};
const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch (_) { response.writeHead(400).end("Bad request"); return; }
  const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end("Forbidden"); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404).end("Not found"); return; }
    response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(response);
  });
});

const report = {
  testStarted: new Date().toISOString(),
  environment: { node: process.version, platform: `${os.type()} ${os.release()}`, playwright: require("playwright/package.json").version, axe: require("axe-core/package.json").version },
  assertions: [], responsive: {}, accessibility: [], performance: {}, codeAudit: {}, sectionErrors: []
};
let browser;
let base;

function check(label, condition, details = undefined) {
  const passed = Boolean(condition);
  report.assertions.push({ label, passed, ...(details === undefined ? {} : { details }) });
  console.log(`${passed ? "PASS" : "FAIL"}: ${label}${!passed && details !== undefined ? " — " + JSON.stringify(details) : ""}`);
  return passed;
}
function money(value) { return `GH₵${Number(value).toFixed(2)}`; }
async function section(label, callback) {
  console.log(`\n## ${label}`);
  try { await callback(); }
  catch (error) {
    report.sectionErrors.push({ section: label, error: error.stack || String(error) });
    check(`${label}: section completed without an unexpected test error`, false, error.message);
  }
}
async function makePage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", ...options });
  await context.addInitScript(() => {
    window.__releaseQA = { transmissions: [], cls: 0 };
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__releaseQA.cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    } catch (_) {}
    const record = (type, url, method) => window.__releaseQA.transmissions.push({ type, url: String(url), method: method || "" });
    if (window.fetch) {
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init = {}) => { record("fetch", typeof input === "string" ? input : input.url, init.method || "GET"); return originalFetch(input, init); };
    }
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) { this.__qaRequest = { method, url }; return originalOpen.call(this, method, url, ...rest); };
    XMLHttpRequest.prototype.send = function(...args) { if (this.__qaRequest) record("XMLHttpRequest", this.__qaRequest.url, this.__qaRequest.method); return originalSend.apply(this, args); };
    if (navigator.sendBeacon) {
      const originalBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = (url, data) => { record("sendBeacon", url, "POST"); return originalBeacon(url, data); };
    }
  });
  const page = await context.newPage();
  const telemetry = { errors: [], failed: [], external: [], nonGet: [] };
  page.on("pageerror", error => telemetry.errors.push(error.message));
  page.on("requestfailed", request => telemetry.failed.push(`${request.url()} ${request.failure()?.errorText || ""}`));
  page.on("request", request => {
    if (!request.url().startsWith(base) && !request.url().startsWith("data:")) telemetry.external.push(`${request.method()} ${request.url()}`);
    if (request.method() !== "GET") telemetry.nonGet.push(`${request.method()} ${request.url()}`);
  });
  return { context, page, telemetry };
}
async function dialogFits(page, selector) {
  return page.locator(selector).evaluate(dialog => {
    const rect = dialog.getBoundingClientRect();
    return dialog.open && rect.left >= -1 && rect.top >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1 && dialog.scrollWidth <= dialog.clientWidth + 1;
  });
}
async function axeScan(page, label) {
  if (!await page.evaluate(() => Boolean(window.axe))) await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const raw = await page.evaluate(async () => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }));
  const violations = raw.violations.map(item => ({ id: item.id, impact: item.impact, description: item.description, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }));
  report.accessibility.push({ label, violations, passes: raw.passes.length, incomplete: raw.incomplete.map(item => item.id) });
  check(label, violations.length === 0, violations);
}
async function swipe(page, selector, fromX = 300, toX = 100, y = 350) {
  await page.locator(selector).evaluate((stage, points) => {
    const start = new Touch({ identifier: 7, target: stage, clientX: points.fromX, clientY: points.y });
    stage.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [start], changedTouches: [start] }));
    const end = new Touch({ identifier: 7, target: stage, clientX: points.toX, clientY: points.y });
    stage.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [end] }));
  }, { fromX, toX, y });
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  report.environment.browser = `Chromium ${browser.version()}`;
  report.baseURL = base;
  console.log(`Testing ${base} with ${report.environment.browser}`);

  await section("Responsive layouts and UI states", async () => {
    for (const viewport of [
      { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 },
      { width: 1024, height: 768 }, { width: 1440, height: 1000 }
    ]) {
      const width = viewport.width;
      const touch = width <= 768;
      const { context, page, telemetry } = await makePage({ viewport, isMobile: width <= 480, hasTouch: touch });
      const response = await page.goto(base, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      check(`${width}px: homepage returns HTTP 200`, response.status() === 200);
      const layout = await page.evaluate(() => {
        const hero = document.querySelector(".hero").getBoundingClientRect();
        const h1 = document.querySelector("h1").getBoundingClientRect();
        const footer = document.querySelector(".site-footer").getBoundingClientRect();
        const primaryButtons = [...document.querySelectorAll(".hero-actions .button")].map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height }));
        const headerButtons = [...document.querySelectorAll(".cart-trigger, .nav-toggle")].filter(button => getComputedStyle(button).display !== "none").map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height }));
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          heroFits: hero.left >= -1 && hero.right <= innerWidth + 1,
          headingFits: h1.left >= -1 && h1.right <= innerWidth + 1 && document.querySelector("h1").scrollWidth <= document.querySelector("h1").clientWidth + 1,
          footerFits: footer.left >= -1 && footer.right <= innerWidth + 1,
          sectionsSized: [...document.querySelectorAll("main > section")].every(section => section.getBoundingClientRect().height > 0),
          crops: [...document.querySelectorAll(".food-card-image img, .gallery-card img, .about-visual > img")].every(image => getComputedStyle(image).objectFit === "cover"),
          primaryButtons, headerButtons,
          desktopNav: getComputedStyle(document.querySelector(".desktop-nav")).display !== "none",
          mobileToggle: getComputedStyle(document.querySelector("[data-nav-toggle]")).display !== "none"
        };
      });
      report.responsive[width] = { viewport, ...layout };
      check(`${width}px: no horizontal page overflow`, !layout.overflow, layout);
      check(`${width}px: hero, headline, sections and footer stay within the layout`, layout.heroFits && layout.headingFits && layout.footerFits && layout.sectionsSized);
      check(`${width}px: editorial image crops use cover sizing`, layout.crops);
      check(`${width}px: primary hero actions are at least 44px high`, layout.primaryButtons.every(button => button.height >= 44 && button.width >= 44), layout.primaryButtons);
      check(`${width}px: visible header controls are at least 40px square`, layout.headerButtons.every(button => button.height >= 40 && button.width >= 40), layout.headerButtons);
      check(`${width}px: correct desktop/mobile navigation is exposed`, width > 1020 ? layout.desktopNav && !layout.mobileToggle : !layout.desktopNav && layout.mobileToggle);

      await page.locator('[data-menu-grid] [data-add-item="jollof-chicken"]').click();
      await page.locator(".cart-trigger").click();
      check(`${width}px: cart drawer fits without internal horizontal overflow`, await dialogFits(page, "#cart-dialog"));
      check(`${width}px: cart layout shows the correct sample total`, (await page.locator("[data-cart-total]").textContent()) === money(68));
      if (touch) {
        const targets = await page.locator('[data-cart-action="increase"], .cart-remove').evaluateAll(buttons => buttons.map(button => {
          const rect = button.getBoundingClientRect();
          return { label: button.getAttribute("aria-label"), width: rect.width, height: rect.height };
        }));
        report.responsive[width].cartTouchTargets = targets;
        check(`${width}px: frequent cart touch controls meet the 44px presentation target`, targets.every(target => target.width >= 44 && target.height >= 44), targets);
      }
      await page.locator("[data-cart-close]").click();
      await page.locator(".cart-trigger").click();
      await page.locator("[data-cart-checkout]").click();
      check(`${width}px: checkout dialog fits without internal horizontal overflow`, await dialogFits(page, "#checkout-dialog"));
      check(`${width}px: checkout order summary retains the correct total`, (await page.locator("[data-checkout-total]").textContent()) === money(68));
      await page.locator("[data-checkout-close]").click();
      await page.locator('[data-gallery-index="0"]').click();
      await page.locator("[data-lightbox-image]").evaluate(image => image.decode());
      check(`${width}px: gallery lightbox fits and its image decodes`, await dialogFits(page, "#gallery-lightbox") && await page.locator("[data-lightbox-image]").evaluate(image => image.naturalWidth > 0));
      await page.locator("[data-lightbox-close]").click();
      check(`${width}px: no runtime errors, failed assets or external requests`, telemetry.errors.length === 0 && telemetry.failed.length === 0 && telemetry.external.length === 0, telemetry);
      await context.close();
    }
  });

  await section("Desktop navigation and keyboard access", async () => {
    const { context, page, telemetry } = await makePage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    check("First Tab focuses the skip-to-content link", await page.evaluate(() => document.activeElement?.classList.contains("skip-link")));
    const focusStyle = await page.locator(".skip-link").evaluate(element => ({ style: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
    check("Keyboard focus has a visible outline", focusStyle.style !== "none" && focusStyle.width >= 2, focusStyle);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    check("Desktop Home link is reachable by keyboard", await page.evaluate(() => document.activeElement?.matches('.desktop-nav a[href="#home"]')));
    for (const id of ["menu", "about", "gallery", "contact", "home"]) {
      await page.locator(`.desktop-nav a[href="#${id}"]`).click();
      await page.waitForTimeout(80);
      check(`Desktop navigation reaches #${id}`, page.url().endsWith(`#${id}`) && await page.locator(`#${id}`).isVisible());
    }
    await page.locator('.brand[href="#home"]').first().click();
    check("Brand link returns to the hero", page.url().endsWith("#home"));
    await page.locator('.hero-actions a[href="#menu"]').click();
    check("Explore Menu reaches the full menu", page.url().endsWith("#menu"));
    const sticky = await page.evaluate(() => {
      const header = document.querySelector("[data-site-header]");
      return { position: getComputedStyle(header).position, top: Math.round(header.getBoundingClientRect().top), scrolled: header.classList.contains("is-scrolled") };
    });
    check("Sticky navigation remains at the viewport top after scrolling", sticky.position === "sticky" && sticky.top === 0 && sticky.scrolled, sticky);
    await page.locator(".header-order").click();
    await page.waitForTimeout(100);
    check("Empty-cart Order Now guides the customer to the menu", await page.evaluate(() => window.scrollY > 0) && (await page.locator("[data-toast]").textContent()).includes("Choose a sample dish"));
    await page.locator(".hero-actions [data-order-now]").click();
    await page.waitForTimeout(80);
    check("Hero Order Now follows the same empty-cart guidance", (await page.locator("[data-toast]").textContent()).includes("Choose a sample dish") && await page.evaluate(() => window.scrollY > 0));
    await page.locator(".journey-action [data-order-now]").click();
    await page.waitForTimeout(80);
    check("Journey Order Now follows the same empty-cart guidance", (await page.locator("[data-toast]").textContent()).includes("Choose a sample dish") && await page.evaluate(() => window.scrollY > 0));
    await page.locator('[data-menu-grid] [data-add-item="jollof-chicken"]').click();
    await page.locator(".header-order").click();
    check("Order Now opens the cart when it contains an item", await page.locator("#cart-dialog").evaluate(dialog => dialog.open));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(30);
    check("Escape closes the cart and restores focus", !await page.locator("#cart-dialog").evaluate(dialog => dialog.open) && await page.evaluate(() => document.activeElement?.classList.contains("header-order")));
    const internal = await page.locator('a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute("href")).filter(href => href && href !== "#").every(href => document.getElementById(href.slice(1))));
    check("Every rendered internal anchor has a valid target", internal);
    check("Desktop navigation journey produces no runtime or network errors", telemetry.errors.length === 0 && telemetry.failed.length === 0 && telemetry.external.length === 0, telemetry);
    await context.close();
  });

  await section("Hero carousel", async () => {
    const { context, page } = await makePage({ reducedMotion: "no-preference" });
    await page.goto(base, { waitUntil: "networkidle" });
    check("Carousel contains four slides and four indicators", await page.locator("[data-hero-slide]").count() === 4 && await page.locator("[data-carousel-slide]").count() === 4);
    check("Carousel exposes exactly one active slide and indicator", await page.locator('[data-hero-slide][aria-hidden="false"]').count() === 1 && await page.locator('[data-carousel-slide][aria-current="true"]').count() === 1);
    const initialCounter = await page.locator("[data-carousel-counter]").textContent();
    await page.waitForTimeout(2200);
    check("Carousel does not move automatically when autoplay is disabled", (await page.locator("[data-carousel-counter]").textContent()) === initialCounter);
    const before = await page.locator("[data-hero-slides]").boundingBox();
    await page.locator("[data-carousel-next]").click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-hero-slide="1"]')).opacity === "1");
    check("Next advances to slide two with the correct caption", (await page.locator("[data-carousel-counter]").textContent()) === "02 / 04" && (await page.locator("[data-carousel-caption]").textContent()) === "Jollof & grilled chicken");
    const after = await page.locator("[data-hero-slides]").boundingBox();
    check("Slide changes preserve carousel geometry", Math.round(before.width) === Math.round(after.width) && Math.round(before.height) === Math.round(after.height));
    await page.locator("[data-carousel-prev]").click();
    check("Previous returns to slide one", (await page.locator("[data-carousel-counter]").textContent()) === "01 / 04");
    await page.locator("[data-carousel-prev]").click();
    check("Previous wraps from the first slide to the fourth", (await page.locator("[data-carousel-counter]").textContent()) === "04 / 04");
    await page.locator('[data-carousel-slide="2"]').click();
    check("Direct indicator selects slide three", (await page.locator("[data-carousel-counter]").textContent()) === "03 / 04" && await page.locator('[data-carousel-slide="2"]').getAttribute("aria-current") === "true");
    await page.locator("[data-hero-carousel]").focus();
    await page.keyboard.press("ArrowRight");
    check("Right arrow advances the focused carousel", (await page.locator("[data-carousel-counter]").textContent()) === "04 / 04");
    await page.keyboard.press("ArrowLeft");
    check("Left arrow returns to the previous slide", (await page.locator("[data-carousel-counter]").textContent()) === "03 / 04");
    check("Manual controls update the polite slide announcement", (await page.locator("[data-carousel-announcement]").textContent()).includes("Slide 3 of 4"));
    const images = await page.locator("[data-hero-slide] img").evaluateAll(images => images.map(image => ({ alt: image.alt, loaded: image.complete && image.naturalWidth > 0, loading: image.loading })));
    check("All carousel images load, decode and have useful alternatives", images.every(image => image.loaded && image.alt.length > 10), images);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    const motion = await page.locator("[data-hero-slide]").first().evaluate(slide => ({ transition: getComputedStyle(slide).transitionDuration, htmlScroll: getComputedStyle(document.documentElement).scrollBehavior }));
    check("Reduced-motion preference disables slide transitions and smooth scrolling", motion.transition === "0s" && motion.htmlScroll === "auto", motion);
    await page.locator("[data-carousel-next]").click();
    check("Reduced-motion slide change is immediately visible", await page.locator('[data-hero-slide="1"]').evaluate(slide => getComputedStyle(slide).opacity === "1" && getComputedStyle(slide).visibility === "visible"));
    await context.close();
  });

  await section("Menu, prices and cart", async () => {
    const { context, page, telemetry } = await makePage({ permissions: ["clipboard-read", "clipboard-write"] });
    await page.goto(base, { waitUntil: "networkidle" });
    check("Four featured dishes, ten menu items and six gallery cards render", await page.locator("[data-featured-grid] .food-card").count() === 4 && await page.locator("[data-menu-grid] .food-card").count() === 10 && await page.locator(".gallery-card").count() === 6);
    const categoryCounts = await page.evaluate(() => Object.fromEntries(window.MSQ_DATA.categories.map(category => [category.id, window.MSQ_DATA.items.filter(item => item.category === category.id).length])));
    for (const [category, expected] of [["all", 10], ...Object.entries(categoryCounts)]) {
      await page.locator(`[data-category="${category}"]`).click();
      check(`Menu filter ${category} returns the data-driven item count`, await page.locator("[data-menu-grid] .food-card").count() === expected && await page.locator(`[data-category="${category}"]`).getAttribute("aria-pressed") === "true");
    }
    await page.locator('[data-category="all"]').click();
    const pricesMatch = await page.evaluate(() => window.MSQ_DATA.items.every(item => {
      const card = document.querySelector(`[data-menu-grid] [data-food-card="${item.id}"]`);
      return card && card.querySelector("h3").textContent === item.name && card.querySelector(".food-price").textContent.replace(/\s/g, "") === `DemopriceGH₵${item.price.toFixed(2)}` && card.querySelector(".food-card-badge").textContent === "Sample dish";
    }));
    check("Every menu card matches its sample name, exact price and demo label", pricesMatch);
    await page.locator("[data-menu-search]").fill("PASTA");
    check("Case-insensitive search finds the matching dish", await page.locator("[data-menu-grid] .food-card").count() === 1 && (await page.locator("[data-menu-grid] h3").textContent()) === "Creamy mushroom pasta");
    await page.locator("[data-search-clear]").click();
    check("Clear-search restores results and returns focus", await page.locator("[data-menu-grid] .food-card").count() === 10 && await page.evaluate(() => document.activeElement?.hasAttribute("data-menu-search")));
    await page.locator("[data-menu-search]").fill("not-a-real-dish-qa");
    check("Unknown search shows the empty state and hides the grid", await page.locator("[data-menu-empty]").isVisible() && await page.locator("[data-menu-grid]").isHidden());
    await page.locator("[data-menu-reset]").click();
    check("Reset restores all dishes, category state and search focus", await page.locator("[data-menu-grid] .food-card").count() === 10 && await page.locator('[data-category="all"]').getAttribute("aria-pressed") === "true" && await page.evaluate(() => document.activeElement?.hasAttribute("data-menu-search")));
    const assetResults = await page.evaluate(async () => {
      const paths = new Set();
      window.MSQ_DATA.heroSlides.forEach(item => { paths.add(item.cardSrc); paths.add(item.src); });
      window.MSQ_DATA.items.forEach(item => { paths.add(item.image); paths.add(item.fullImage); });
      window.MSQ_DATA.gallery.forEach(item => { paths.add(item.thumb); paths.add(item.src); });
      return Promise.all([...paths].map(src => new Promise(resolve => { const image = new Image(); image.onload = () => resolve({ src, ok: image.naturalWidth > 0 }); image.onerror = () => resolve({ src, ok: false }); image.src = src; })));
    });
    check("Every menu and gallery image asset loads successfully", assetResults.every(asset => asset.ok), assetResults.filter(asset => !asset.ok));

    await page.locator(".cart-trigger").click();
    check("Empty cart shows its empty state and hides checkout actions", await page.locator("[data-cart-empty]").isVisible() && await page.locator("[data-cart-footer]").isHidden());
    await page.locator("[data-cart-close]").click();
    await page.locator('[data-menu-grid] [data-add-item="jollof-chicken"]').click();
    await page.locator('[data-menu-grid] [data-add-item="jollof-chicken"]').click();
    await page.locator('[data-featured-grid] [data-add-item="tilapia-banku"]').click();
    check("Add-to-cart groups duplicate products and updates the count", await page.evaluate(() => window.MSQCart.getCount() === 3 && window.MSQCart.getLines().length === 2));
    await page.locator(".cart-trigger").click();
    check("Initial cart subtotals and total are correct", (await page.locator('[data-cart-line="jollof-chicken"] .cart-line-side strong').textContent()) === money(136) && (await page.locator('[data-cart-line="tilapia-banku"] .cart-line-side strong').textContent()) === money(95) && (await page.locator("[data-cart-total]").textContent()) === money(231));
    await page.locator('[data-cart-line="tilapia-banku"] [data-cart-action="increase"]').click();
    check("Increasing quantity recalculates line and order totals", (await page.locator('[data-cart-line="tilapia-banku"] .cart-line-side strong').textContent()) === money(190) && (await page.locator("[data-cart-total]").textContent()) === money(326));
    await page.locator('[data-cart-line="jollof-chicken"] [data-cart-action="decrease"]').click();
    check("Decreasing quantity recalculates the total", (await page.locator("[data-cart-total]").textContent()) === money(258));
    check("Decrease is disabled at quantity one", await page.locator('[data-cart-line="jollof-chicken"] [data-cart-action="decrease"]').isDisabled());
    await page.locator('[data-cart-line="tilapia-banku"] [data-cart-action="remove"]').click();
    check("Removing a product leaves the correct remaining total", await page.locator("[data-cart-line]").count() === 1 && (await page.locator("[data-cart-total]").textContent()) === money(68));
    await page.locator("[data-cart-close]").click();
    await page.reload({ waitUntil: "networkidle" });
    check("Cart persists across reload with the correct item and quantity", await page.evaluate(() => window.MSQCart.getCount() === 1 && window.MSQCart.getTotal() === 68));
    const stored = await page.evaluate(() => ({ keys: Object.keys(localStorage), cart: JSON.parse(localStorage.getItem(window.MSQ_CONFIG.storageKey)) }));
    check("Persistence stores only cart item IDs and quantities", stored.keys.length === 1 && stored.cart.every(line => Object.keys(line).sort().join(",") === "itemId,quantity"), stored);
    await page.evaluate(() => { for (let index = 0; index < 25; index++) window.MSQCart.add("jollof-chicken"); });
    check("Cart enforces the maximum quantity of twenty", await page.evaluate(() => window.MSQCart.getCount() === 20));
    await page.evaluate(() => window.MSQCart.clear());
    check("Clearing the cart restores the empty state and zero total", await page.evaluate(() => window.MSQCart.getCount() === 0 && window.MSQCart.getTotal() === 0));
    const unresolvedFailures = telemetry.failed.filter(failure => !failure.includes("net::ERR_ABORTED"));
    check("Menu and cart interactions produce no unexpected requests or errors", telemetry.errors.length === 0 && unresolvedFailures.length === 0 && telemetry.nonGet.length === 0 && telemetry.external.length === 0, { ...telemetry, unresolvedFailures, navigationCancelled: telemetry.failed.filter(failure => failure.includes("net::ERR_ABORTED")) });
    await context.close();
  });

  await section("Checkout and demo safety", async () => {
    const { context, page, telemetry } = await makePage({ permissions: ["clipboard-read", "clipboard-write"] });
    await page.goto(base, { waitUntil: "networkidle" });
    check("Demo configuration explicitly disables live ordering", await page.evaluate(() => window.MSQ_CONFIG.demoMode === true && window.MSQ_CONFIG.whatsapp.enabled === false && window.MSQ_CONFIG.whatsapp.authorizedNumber === ""));
    check("Research contact is display-only and no restaurant contact links exist", await page.locator('a[href^="tel:"], a[href*="wa.me"], a[href*="whatsapp.com"], a[href^="mailto:"]').count() === 0);
    check("Checkout form has no external action and all sample disclosures remain visible", await page.locator("#checkout-form").getAttribute("action") === null && await page.locator(".menu-demo-stamp").isVisible() && await page.locator(".demo-ribbon").isVisible());
    await page.locator('[data-menu-grid] [data-add-item="jollof-chicken"]').click();
    await page.locator('[data-menu-grid] [data-add-item="jollof-chicken"]').click();
    await page.locator('[data-menu-grid] [data-add-item="tilapia-banku"]').click();
    await page.locator(".cart-trigger").click();
    check("WhatsApp action remains hidden before checkout", await page.locator("[data-whatsapp-link]").isHidden() && await page.locator("[data-whatsapp-link]").getAttribute("href") === null);
    await page.locator("[data-cart-checkout]").click();
    check("Checkout summary lists both products and the correct total", await page.locator("[data-checkout-summary] .summary-line").count() === 2 && (await page.locator("[data-checkout-total]").textContent()) === money(231));
    check("Pickup is selected and delivery location is initially hidden and optional", await page.locator('input[name="order-type"][value="Pickup"]').isChecked() && await page.locator("[data-delivery-field]").isHidden() && !await page.locator("#delivery-location").getAttribute("required"));
    await page.locator('#checkout-form button[type="submit"]').click();
    check("Required validation blocks an empty submission", await page.locator("[data-order-preview]").isHidden() && (await page.locator("#name-error").textContent()).length > 0 && (await page.locator("#phone-error").textContent()).length > 0);
    check("Validation focuses the first invalid field", await page.evaluate(() => document.activeElement?.id === "customer-name"));
    await page.locator("#customer-name").fill("A");
    await page.locator("#customer-phone").fill("not-a-phone");
    await page.locator('#checkout-form button[type="submit"]').click();
    check("Invalid demo name and phone remain blocked", await page.locator("#customer-name").getAttribute("aria-invalid") === "true" && await page.locator("#customer-phone").getAttribute("aria-invalid") === "true");
    await page.locator("#customer-name").fill("Demo Customer");
    await page.locator("#customer-phone").fill("024 000 0000");
    await page.locator('input[name="order-type"][value="Delivery"]').check();
    check("Delivery selection reveals and requires the conditional location field", await page.locator("[data-delivery-field]").isVisible() && await page.locator("#delivery-location").getAttribute("required") !== null);
    await page.locator('#checkout-form button[type="submit"]').click();
    check("Delivery submission requires a fictional location", (await page.locator("#delivery-error").textContent()).length > 0 && await page.evaluate(() => document.activeElement?.id === "delivery-location"));
    await page.locator("#delivery-location").fill("Fictional QA location");
    await page.locator("#order-instructions").fill("Demonstration only");
    await page.locator('#checkout-form button[type="submit"]').click();
    check("Valid delivery details generate the local order preview", await page.locator("[data-order-preview]").isVisible() && await page.locator("[data-checkout-form-view]").isHidden());
    const message = await page.locator("[data-order-message]").inputValue();
    check("Generated message contains the correct customer, items and total", message.includes("Demo Customer") && message.includes("2. Banku & grilled tilapia") && message.includes("DEMO TOTAL: GH₵231.00") && message.includes("Delivery location: Fictional QA location"));
    check("Generated message clearly states sample, unsent and no-payment status", message.includes("DEMONSTRATION ORDER — NOT SENT") && message.includes("All dishes and prices are illustrative.") && message.includes("No payment has been made. No order has been transmitted."));
    check("WhatsApp remains hidden with no URL after message generation", await page.locator("[data-whatsapp-link]").isHidden() && await page.locator("[data-whatsapp-link]").getAttribute("href") === null);
    const transmissions = await page.evaluate(() => window.__releaseQA.transmissions);
    check("No fetch, XHR or beacon transmission occurs during checkout", transmissions.length === 0 && telemetry.nonGet.length === 0 && telemetry.external.length === 0, { transmissions, telemetry });
    const persisted = await page.evaluate(() => ({ local: Object.values(localStorage).join(" "), session: Object.values(sessionStorage).join(" ") }));
    check("Customer details are not persisted in browser storage", !persisted.local.includes("Demo Customer") && !persisted.local.includes("024 000 0000") && !persisted.session.includes("Demo Customer"), persisted);
    await page.locator("[data-copy-order]").click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    check("Copy-message copies the exact local preview without sending it", copied === message);
    await page.locator("[data-edit-order]").click();
    check("Edit details returns to the populated checkout form", await page.locator("[data-checkout-form-view]").isVisible() && await page.locator("#customer-name").inputValue() === "Demo Customer");
    await page.locator('input[name="order-type"][value="Pickup"]').check();
    check("Returning to Pickup hides and clears delivery validation", await page.locator("[data-delivery-field]").isHidden() && await page.locator("#delivery-location").getAttribute("aria-invalid") === "false");
    await page.locator('#checkout-form button[type="submit"]').click();
    check("Pickup message omits the delivery-location line", !(await page.locator("[data-order-message]").inputValue()).includes("Delivery location:"));
    await page.locator("[data-finish-demo]").click();
    check("Finish clears the demo cart and closes checkout without contacting anyone", !await page.locator("#checkout-dialog").evaluate(dialog => dialog.open) && await page.evaluate(() => window.MSQCart.getCount() === 0) && telemetry.nonGet.length === 0 && telemetry.external.length === 0);
    check("No payment fields, processors or payment requests exist", await page.locator('input[name*="card" i], input[name*="payment" i], iframe[src*="pay" i], script[src*="pay" i]').count() === 0 && telemetry.external.every(request => !/pay|stripe|flutterwave|paystack/i.test(request)));
    await context.close();
  });

  await section("Gallery and mobile gestures", async () => {
    const { context, page } = await makePage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.locator("[data-nav-toggle]").click();
    check("Mobile navigation opens with accurate ARIA state", await page.locator("#mobile-menu").isVisible() && await page.locator("[data-nav-toggle]").getAttribute("aria-expanded") === "true");
    await page.keyboard.press("Escape");
    check("Mobile Escape closes navigation and restores toggle focus", await page.locator("#mobile-menu").isHidden() && await page.evaluate(() => document.activeElement?.hasAttribute("data-nav-toggle")));
    await page.locator("[data-nav-toggle]").click();
    await page.locator("#mobile-menu [data-order-now]").click();
    await page.waitForTimeout(80);
    check("Mobile-menu Order Now closes navigation and provides empty-cart guidance", await page.locator("#mobile-menu").isHidden() && (await page.locator("[data-toast]").textContent()).includes("Choose a sample dish"));
    await page.locator("[data-nav-toggle]").click();
    await page.locator('#mobile-menu a[href="#gallery"]').click();
    check("Mobile navigation link closes the panel and reaches its section", await page.locator("#mobile-menu").isHidden() && page.url().endsWith("#gallery"));
    await page.locator('[data-gallery-index="0"]').click();
    await page.locator("[data-lightbox-image]").evaluate(image => image.decode());
    check("Gallery lightbox opens with a loaded image and correct counter", await page.locator("#gallery-lightbox").evaluate(dialog => dialog.open) && await page.locator("[data-lightbox-image]").evaluate(image => image.naturalWidth > 0) && (await page.locator("[data-lightbox-counter]").textContent()) === "01 / 06");
    await page.locator("[data-lightbox-next]").click();
    check("Gallery Next advances to image two", (await page.locator("[data-lightbox-counter]").textContent()) === "02 / 06");
    await page.locator("[data-lightbox-prev]").click();
    check("Gallery Previous returns to image one", (await page.locator("[data-lightbox-counter]").textContent()) === "01 / 06");
    await page.locator("[data-lightbox-prev]").click();
    check("Gallery Previous wraps to the last image", (await page.locator("[data-lightbox-counter]").textContent()) === "06 / 06");
    await page.keyboard.press("ArrowRight");
    check("Gallery right-arrow keyboard control wraps to image one", (await page.locator("[data-lightbox-counter]").textContent()) === "01 / 06");
    await page.keyboard.press("ArrowLeft");
    check("Gallery left-arrow keyboard control returns to image six", (await page.locator("[data-lightbox-counter]").textContent()) === "06 / 06");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(30);
    check("Gallery Escape closes and restores focus to the originating thumbnail", !await page.locator("#gallery-lightbox").evaluate(dialog => dialog.open) && await page.evaluate(() => document.activeElement?.dataset.galleryIndex === "0"));
    await swipe(page, "[data-hero-slides]");
    check("Mobile hero swipe advances the carousel", (await page.locator("[data-carousel-counter]").textContent()) === "02 / 04");
    await page.locator('[data-gallery-index="0"]').click();
    await swipe(page, "[data-lightbox-stage]");
    check("Mobile gallery swipe advances the lightbox", (await page.locator("[data-lightbox-counter]").textContent()) === "02 / 06");
    await page.locator("[data-lightbox-close]").click();
    check("Gallery close button exits the lightbox", !await page.locator("#gallery-lightbox").evaluate(dialog => dialog.open));
    await context.close();
  });

  await section("Accessibility audit", async () => {
    const { context, page } = await makePage();
    await page.goto(base, { waitUntil: "networkidle" });
    const semantics = await page.evaluate(() => ({
      main: document.querySelectorAll("main").length, h1: document.querySelectorAll("h1").length,
      navs: document.querySelectorAll("nav[aria-label]").length,
      unlabeledImages: [...document.images].filter(image => !image.hasAttribute("alt")).length,
      unlabeledInputs: [...document.querySelectorAll("input, textarea")].filter(input => input.type !== "radio" && !document.querySelector(`label[for="${input.id}"]`) && !input.getAttribute("aria-label")).length,
      unnamedButtons: [...document.querySelectorAll("button")].filter(button => !(button.getAttribute("aria-label") || button.textContent.trim())).length
    }));
    check("Semantic landmarks, heading, image alternatives, labels and button names are present", semantics.main === 1 && semantics.h1 === 1 && semantics.navs >= 2 && semantics.unlabeledImages === 0 && semantics.unlabeledInputs === 0 && semantics.unnamedButtons === 0, semantics);
    await axeScan(page, "Axe: desktop homepage has no detected WCAG A/AA violations");
    await page.locator('[data-featured-grid] [data-add-item="jollof-chicken"]').click();
    await page.locator(".cart-trigger").click();
    await axeScan(page, "Axe: cart drawer has no detected WCAG A/AA violations");
    const focusContained = await page.evaluate(() => {
      const dialog = document.getElementById("cart-dialog");
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), [href], input, textarea, [tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length);
      return focusable.length > 0 && dialog.contains(document.activeElement);
    });
    check("Native modal dialog places keyboard focus inside the cart", focusContained);
    await page.locator("[data-cart-checkout]").click();
    await axeScan(page, "Axe: checkout dialog has no detected WCAG A/AA violations");
    await page.locator("[data-checkout-close]").click();
    await page.locator('[data-gallery-index="0"]').click();
    await axeScan(page, "Axe: gallery lightbox has no detected WCAG A/AA violations");
    await context.close();

    const mobile = await makePage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mobile.page.goto(base, { waitUntil: "networkidle" });
    await axeScan(mobile.page, "Axe: mobile homepage has no detected WCAG A/AA violations");
    await mobile.page.locator("[data-nav-toggle]").click();
    await axeScan(mobile.page, "Axe: open mobile navigation has no detected WCAG A/AA violations");
    await mobile.context.close();
  });

  await section("Loading performance and layout stability", async () => {
    const { context, page, telemetry } = await makePage({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      window.__qaVitals = { lcp: 0, fcp: 0 };
      try { new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__qaVitals.lcp = Math.max(window.__qaVitals.lcp, entry.startTime); }).observe({ type: "largest-contentful-paint", buffered: true }); } catch (_) {}
      try { new PerformanceObserver(list => { for (const entry of list.getEntries()) if (entry.name === "first-contentful-paint") window.__qaVitals.fcp = entry.startTime; }).observe({ type: "paint", buffered: true }); } catch (_) {}
    });
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const initial = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd,
        load: navigation.loadEventEnd,
        resources: resources.length,
        transferBytes: navigation.transferSize + resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0),
        decodedBodyBytes: navigation.encodedBodySize + resources.reduce((sum, resource) => sum + (resource.encodedBodySize || 0), 0),
        cls: window.__releaseQA.cls,
        ...window.__qaVitals,
        fonts: [...document.fonts].map(font => ({ family: font.family, status: font.status })),
        scripts: performance.getEntriesByType("resource").filter(resource => resource.initiatorType === "script").map(resource => resource.name.split("/").pop())
      };
    });
    report.performance.initial = initial;
    check("Initial local load transfers less than 1 MB before lazy content", initial.transferBytes < 1000000, initial);
    check("Initial layout shift remains below the 0.1 good-experience threshold", initial.cls < 0.1, { cls: initial.cls });
    check("Both final font families load successfully", initial.fonts.filter(font => /Fraunces|Manrope/.test(font.family)).every(font => font.status === "loaded") && initial.fonts.some(font => /Fraunces/.test(font.family)) && initial.fonts.some(font => /Manrope/.test(font.family)), initial.fonts);
    check("All eight modular runtime scripts load with no unused dependency framework", initial.scripts.length === 8 && !initial.scripts.some(script => /react|vue|angular|jquery/i.test(script)), initial.scripts);
    await page.evaluate(async () => {
      for (const image of document.images) {
        image.scrollIntoView({ block: "center" });
        await new Promise(resolve => setTimeout(resolve, 35));
      }
    });
    await page.waitForFunction(() => [...document.images].filter(image => image.getAttribute("src")).every(image => image.complete && image.naturalWidth > 0), null, { timeout: 15000 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(500);
    const settled = await page.evaluate(() => ({ cls: window.__releaseQA.cls, images: [...document.images].filter(image => image.getAttribute("src")).map(image => ({ src: image.getAttribute("src"), currentSrc: image.currentSrc, loaded: image.complete && image.naturalWidth > 0 })) }));
    report.performance.afterScroll = settled;
    check("All rendered images load after a complete page journey", settled.images.every(image => image.loaded), settled.images.filter(image => !image.loaded));
    check("Full-page loading and scrolling retain CLS below 0.1", settled.cls < 0.1, { cls: settled.cls });
    check("Performance journey has no JavaScript errors or failed requests", telemetry.errors.length === 0 && telemetry.failed.length === 0, telemetry);
    await context.close();
  });

  await section("Static code and asset audit", async () => {
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
    const localRefs = [...html.matchAll(/(?:src|href)="((?:assets|css|js)\/[^"]+)"/g)].map(match => match[1]);
    const srcsetRefs = [...html.matchAll(/srcset="([^"]+)"/g)].flatMap(match => match[1].split(",").map(candidate => candidate.trim().split(/\s+/)[0])).filter(ref => ref.startsWith("assets/"));
    const missing = [...localRefs, ...srcsetRefs].filter(ref => !fs.existsSync(path.join(root, ref)));
    check("Static HTML has unique IDs and no broken internal anchors", new Set(ids).size === ids.length && anchors.every(id => ids.includes(id)));
    check("Every statically referenced local script, style, font and image exists", missing.length === 0, missing);
    const projectFiles = [];
    function walk(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { if ([".git", "node_modules"].includes(entry.name)) continue; const full = path.join(directory, entry.name); if (entry.isDirectory()) walk(full); else projectFiles.push(full); } }
    walk(root);
    const images = projectFiles.filter(file => /\.(png|jpe?g|webp)$/i.test(file) && file.includes(`${path.sep}assets${path.sep}images${path.sep}`));
    const imageBytes = images.map(file => ({ file: path.relative(root, file), bytes: fs.statSync(file).size }));
    report.codeAudit.images = imageBytes;
    check("Runtime food imagery uses local WebP files with a single social JPEG", imageBytes.every(image => image.file.endsWith(".webp") || image.file.endsWith("social-preview.jpg")));
    check("No individual runtime image exceeds 200 KB", imageBytes.filter(image => !image.file.endsWith("social-preview.jpg")).every(image => image.bytes <= 200 * 1024), imageBytes.filter(image => image.bytes > 200 * 1024));
    const css = ["style.css", "responsive.css"].map(file => fs.readFileSync(path.join(root, "css", file), "utf8")).join("\n");
    check("Final CSS uses only Fraunces and Manrope as downloaded font families", /font-family:\s*["']?Fraunces/.test(css) && /font-family:\s*["']?Manrope/.test(css) && !/cormorant|playfair|DM Sans/i.test(css));
    check("Font declarations use swap and no runtime CDN dependencies", (css.match(/font-display:\s*swap/g) || []).length === 2 && !/@import|https?:\/\//i.test(css));
    const runtimeScripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(match => match[1]);
    check("Runtime remains eight deferred vanilla-JavaScript modules", runtimeScripts.length === 8 && runtimeScripts.every(script => script.startsWith("js/")));
    check("Project contains no production package dependency or build requirement", !fs.existsSync(path.join(root, "package.json")) && !fs.existsSync(path.join(root, "node_modules")));
  });

  report.testFinished = new Date().toISOString();
  report.summary = {
    passed: report.assertions.filter(assertion => assertion.passed).length,
    failed: report.assertions.filter(assertion => !assertion.passed).length,
    total: report.assertions.length
  };
  fs.writeFileSync(resultPath, JSON.stringify(report, null, 2));
  console.log(`\nFINAL QA RESULT: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.total} total`);
  console.log(`Machine-readable results: ${resultPath}`);
  await browser.close();
  server.close();
  if (report.summary.failed) process.exitCode = 1;
})().catch(async error => {
  console.error(error.stack || error);
  report.sectionErrors.push({ section: "fatal", error: error.stack || String(error) });
  report.summary = { passed: report.assertions.filter(assertion => assertion.passed).length, failed: report.assertions.filter(assertion => !assertion.passed).length + 1, total: report.assertions.length + 1 };
  fs.writeFileSync(resultPath, JSON.stringify(report, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
});
