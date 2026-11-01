# Ms. Q Cafe & Restaurant — Premium Website Concept Demo

**Project owner:** Enkayjay Digital Solutions  
**Status:** Independent concept demonstration; not commissioned, approved or endorsed by Ms. Q Cafe & Restaurant.

A responsive restaurant website concept built with semantic HTML, modern CSS and vanilla JavaScript. The refined visual system pairs Fraunces editorial headings with Manrope interface text, organic image frames, curved cards and a four-slide hero carousel. It includes original local food imagery, an editable sample menu, working cart, local-only checkout preview and an accessible gallery. No framework, build step, backend, payment service or external front-end request is required.

## Demonstration safeguards

- All dishes, descriptions and prices are illustrative and labelled as samples.
- The research contact `0543960742` is displayed as **demo only** and is not linked to ordering.
- `demoMode` is `true`; WhatsApp integration is disabled and has no authorized number.
- Checkout generates a formatted message locally. It does not send orders, save customer details or make network requests.
- Only cart item IDs and quantities are kept in browser `localStorage`; customer details are never persisted.
- No testimonials, awards, history, branches, exact address, opening hours or business achievements are invented.
- The site contains no live `wa.me` or WhatsApp ordering links in demo mode.

## Completed features

- Sticky responsive navigation, mobile menu and live cart count
- Premium asymmetric hero with a four-image, user-controlled carousel
- Carousel previous/next controls, indicators, keyboard navigation, mobile swipe and reduced-motion support
- Organic image masks, curved cards, pill actions and soft section transitions
- Four featured dishes in a desktop grid and mobile scroll-snap rail
- Ten full-menu items across six categories
- Category filters, search, clear/reset controls and empty results
- Add/remove products, quantity controls, item subtotals and order total
- Persistent demo cart using item IDs and quantities only
- Responsive cart drawer and checkout dialog
- Pickup/delivery selection and conditional delivery-location validation
- Formatted order-message generation and clipboard copy
- Hard-blocked WhatsApp action until explicit future configuration
- Responsive six-image gallery with lightbox, keyboard navigation and mobile swipe
- Contact/location/hours/social placeholders and non-live map placeholder
- Toast feedback, scroll reveals, hover states and reduced-motion support
- Local fonts, original optimized WebP images, favicon and social metadata

## Exact project structure

```text
msq-cafe-demo/
├── index.html
├── README.md
├── TESTING.md
├── FINAL-QA-REPORT.md
├── assets/
│   ├── fonts/
│   │   ├── fraunces-latin.woff2
│   │   ├── fraunces-OFL.txt
│   │   ├── manrope-latin.woff2
│   │   └── manrope-OFL.txt
│   ├── icons/
│   │   └── favicon.svg
│   └── images/
│       ├── chocolate-cake-card.webp
│       ├── chocolate-cake.webp
│       ├── croissant-card.webp
│       ├── croissant.webp
│       ├── hero-card.webp
│       ├── hero.webp
│       ├── hibiscus-card.webp
│       ├── hibiscus.webp
│       ├── jollof-chicken-card.webp
│       ├── jollof-chicken.webp
│       ├── pasta-card.webp
│       ├── pasta.webp
│       ├── red-red-card.webp
│       ├── red-red.webp
│       ├── skewers-card.webp
│       ├── skewers.webp
│       ├── social-preview.jpg
│       ├── spring-rolls-card.webp
│       ├── spring-rolls.webp
│       ├── tilapia-card.webp
│       └── tilapia.webp
├── css/
│   ├── style.css
│   └── responsive.css
├── js/
│   ├── config.js
│   ├── data.js
│   ├── main.js
│   ├── carousel.js
│   ├── menu.js
│   ├── cart.js
│   ├── checkout.js
│   └── gallery.js
├── previews/
│   ├── desktop-preview.png
│   └── mobile-preview.png
├── sales-presentation/
│   ├── MS-Q-Website-Concept.pdf
│   ├── SALES-OVERVIEW.md
│   ├── FEATURES.md
│   ├── RESTAURANT-REQUIREMENTS.md
│   ├── presentation-source.html
│   └── screenshots/
│       ├── desktop/
│       │   ├── 01-hero.png
│       │   ├── 02-featured-menu.png
│       │   ├── 03-full-menu.png
│       │   ├── 04-about.png
│       │   ├── 05-gallery.png
│       │   └── 06-contact-footer.png
│       └── mobile/
│           ├── 01-hero.png
│           ├── 02-navigation.png
│           ├── 03-menu.png
│           ├── 04-cart.png
│           └── 05-checkout.png
└── tests/
    ├── browser-tests.js
    ├── final-qa.js
    ├── final-qa-results.json
    ├── final-qa.log
    ├── legacy-regression.log
    └── lighthouse-results.json
```

## Run locally

No installation is needed for the website itself. From the directory containing the extracted project:

```bash
cd msq-cafe-demo
python3 -m http.server 8001
```

Open **http://localhost:8001** on the same computer. Stop the server with `Ctrl+C`. This is a local preview only; do not treat it as a public deployment or live ordering service.

## Editing the concept

| Content | File |
|---|---|
| Demo safety, research contact and future WhatsApp configuration | `js/config.js` |
| Categories, dishes, prices, descriptions, hero slides and gallery content | `js/data.js` |
| Page sections, placeholders and concept disclosures | `index.html` |
| Brand tokens, components and dialogs | `css/style.css` |
| Breakpoints and small-screen layouts | `css/responsive.css` |
| Navigation, reveals and shared utilities | `js/main.js` |
| Hero carousel controls, keyboard and swipe | `js/carousel.js` |
| Menu filtering/search and food cards | `js/menu.js` |
| Cart state and calculations | `js/cart.js` |
| Checkout validation and message preview | `js/checkout.js` |
| Gallery and lightbox | `js/gallery.js` |

After changing menu items, update any hard-coded demonstration counts in `index.html`. Replace image files while preserving their paths, or update the paths in `js/data.js` and `index.html`.

## Future authorized WhatsApp activation

The current configuration intentionally contains:

```js
demoMode: true,
whatsapp: {
  enabled: false,
  authorizedNumber: ""
}
```

Only after the restaurant gives explicit authorization and verifies its ordering number should a developer:

1. Replace the sample menu, prices, research-contact labels and demo disclosures with approved business content.
2. Set `authorizedNumber` to the verified international-format digits.
3. Set `whatsapp.enabled` to `true` and `demoMode` to `false`.
4. Test the complete workflow with the restaurant’s consent before publishing.

All three code conditions—demo mode off, integration enabled and a valid authorized number—are required before the link can appear. Do not use the lead-research number as an authorized ordering number without permission.

## Testing

**Latest release audit — 1 November 2026:** 186 final-QA assertions passed with 0 failures. The separate 83-assertion legacy regression suite also passed. See `FINAL-QA-REPORT.md` for exact coverage, discovered issues, accessibility results, Lighthouse metrics and remaining limitations.

The new suite covers all required viewports, navigation and Order Now variants, carousel behaviour, filters/search, exact sample prices, cart calculations/persistence, checkout, network-level demo safety, gallery, keyboard/touch interaction, six axe states, responsive images, loading performance and layout stability.

To rerun with Node.js and temporary development-only tools:

```bash
npm install --prefix /tmp/msq-test-tools playwright@1.64.1 axe-core@4.11.1
/tmp/msq-test-tools/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/msq-test-tools/node_modules node tests/final-qa.js
NODE_PATH=/tmp/msq-test-tools/node_modules node tests/browser-tests.js
```

Evidence is included in `tests/final-qa-results.json`, `tests/final-qa.log`, `tests/legacy-regression.log` and `tests/lighthouse-results.json`. `TESTING.md` retains the earlier-stage regression report.

## Sales presentation package

The `sales-presentation/` folder contains:

- A polished six-page `MS-Q-Website-Concept.pdf`
- Six desktop and five mobile clean screenshots
- `SALES-OVERVIEW.md` for the business walkthrough
- `FEATURES.md` for feature/value talking points
- `RESTAURANT-REQUIREMENTS.md` for the official-content and authorization discussion
- `presentation-source.html` as the editable PDF layout source

The project is ready to present as an independent concept. It is not approved for official launch or live ordering until restaurant-owned content and explicit activation decisions are completed.

## Intentionally incomplete / not activated

These are not failed demo features; they require official business input or authorization:

- Real restaurant logo, story, menu, prices and photography
- Live WhatsApp ordering or other order transmission
- Payments, backend order storage and customer accounts
- Exact map coordinates and embedded map
- Confirmed address, opening hours and social-media links
- Production-domain canonical/social URLs and deployment

## Information needed from the restaurant for an official version

1. Approved logo, brand colours and any brand guidelines.
2. Complete menu: categories, item names, descriptions, prices, availability and dietary details they want published.
3. Authentic, approved food and restaurant photographs.
4. Approved restaurant introduction and any differentiators they want highlighted.
5. Verified phone number and explicit authorization for WhatsApp ordering.
6. Confirmed address, map pin, opening hours and social-profile URLs.
7. Pickup/delivery rules, fees, service areas, payment instructions and ordering policies.
8. Final domain/hosting decisions and production SEO/social-sharing details.

## Asset notes

- Concept images were AI-generated for this demonstration and are served locally. They do not depict verified Ms. Q products or premises and should be replaced with authentic approved photography for an official website.
- Fraunces and Manrope are the final self-hosted font pairing, licensed under the SIL Open Font License; license files are included in `assets/fonts/`. Playfair Display and DM Sans were evaluated during the design comparison but are not included in the final project.
- Existing card and full-size WebP variants are selected responsively where appropriate; full images remain available for high-density screens and the gallery lightbox.
- No third-party images, fonts, scripts or styles are hotlinked at runtime.
