# Ms. Q Cafe & Restaurant Concept — Final QA Report

**Project owner:** Enkayjay Digital Solutions  
**Test date:** 1 November 2026  
**Project status:** Independent concept demonstration; not commissioned, approved or endorsed by Ms. Q  
**Release result:** **186 passed, 0 failed** in the new final-QA suite

## 1. Executive summary

The current version passed the fresh functional, responsive, accessibility and demo-safety audit. The design direction was preserved. Fixes were limited to touch usability, reduced-motion behaviour, accessible semantics and measured loading optimizations.

The separate 83-assertion legacy regression suite also passed. The two suites overlap and are reported separately rather than combined into an inflated total.

**Recommendation:** ready to present to Ms. Q as an independent concept and working interaction prototype. It is not ready for official launch with real restaurant content or live ordering until the requirements and limitations in this report are addressed.

## 2. Browser and environment

| Item | Environment |
|---|---|
| Browser | Chromium 156.0.8078.4, headless |
| Automation | Playwright 1.64.1 |
| Accessibility engine | axe-core 4.11.1 |
| Performance audit | Lighthouse 12.8.2 |
| Runtime | Node.js 20.20.2; Linux 6.1.158+ |
| Website server | Local static HTTP server; final-QA suite used an isolated random local port |
| Lighthouse target | `http://127.0.0.1:8001/` using the same latest project files |
| External services | None used by the website; no paid QA service used |

The new suite starts a server directly from the current source files and records results in `tests/final-qa-results.json` and `tests/final-qa.log`.

## 3. Test totals

| Test set | Passed | Failed | Notes |
|---|---:|---:|---|
| New independent final-QA suite | **186** | **0** | Final release result |
| Legacy regression suite | **83** | **0** | Separate confirmation of the earlier acceptance criteria |
| axe scans within final QA | **6 states scanned** | **0 detected violations** | Automated results only; not a compliance certification |
| Lighthouse mobile | — | — | 90 performance; 100 accessibility; 100 best practices; 91 SEO |
| Lighthouse desktop | — | — | 100 performance; 100 accessibility; 100 best practices; 91 SEO |

The first fresh audit run produced 166 passes and 17 failures. Each failure was investigated before the final run; website defects and test-harness artefacts were handled separately as documented below. A final coverage review added three explicit Order Now variant checks, bringing the release suite to 186 assertions.

## 4. Exact tests performed

### Navigation and keyboard access

- Loaded desktop and mobile navigation at the appropriate breakpoints.
- Exercised every desktop navigation link: Home, Menu, About, Gallery and Contact.
- Tested brand Home, Explore Menu and rendered internal-anchor targets.
- Verified sticky-header position and scrolled state.
- Tested header, hero, journey and mobile-menu Order Now variants with an empty cart, plus the header action with an item present.
- Opened and closed mobile navigation; checked ARIA state, section navigation and Escape focus restoration.
- Tabbed to the skip link and desktop navigation; checked visible focus styling.
- Closed the cart with Escape and verified focus restoration.

### Hero carousel

- Confirmed four slides, four indicators and one exposed active slide.
- Tested Next, Previous, first/last wrapping and direct indicator selection.
- Tested left/right keyboard controls and slide announcements.
- Verified captions, counters and stable frame geometry.
- Loaded and decoded every responsive image candidate and checked alternative text.
- Waited 2.2 seconds without interaction and confirmed no automatic movement.
- Emulated mobile touch input and tested swipe.
- Emulated reduced motion and checked immediate visible slide changes, disabled transitions and non-smooth scrolling.

### Menu and sample prices

- Verified four featured dishes, ten full-menu dishes and six gallery cards.
- Tested All and all six category filters against counts derived from the editable data.
- Checked every rendered dish name, exact sample price and Sample dish/Demo price label against `js/data.js`.
- Tested case-insensitive search, clear-search focus, unknown-search empty state and full reset.
- Loaded all menu, hero and gallery image assets.

### Shopping cart

- Checked the empty cart and hidden checkout actions.
- Added products from the full and featured menus; verified duplicate grouping.
- Tested quantity increase/decrease, quantity-one disablement, removal and clear.
- Verified line subtotals and totals including GH₵68.00, GH₵136.00, GH₵190.00, GH₵231.00, GH₵258.00 and GH₵326.00 fixtures.
- Reloaded the page and verified persistence.
- Inspected stored data and confirmed only item IDs and quantities are persisted.
- Tested the maximum quantity boundary of 20.
- Opened the cart at every required viewport and checked its dimensions, total and internal overflow.

### Checkout

- Verified summary line count and total.
- Checked Pickup default, Delivery selection and conditional location visibility/requirement.
- Submitted empty and invalid details; checked errors and first-invalid-field focus.
- Tested missing delivery location and valid fictional delivery details.
- Generated Pickup and Delivery messages; checked customer details, items, quantities, total and disclosures.
- Confirmed Pickup messages omit the delivery-location line.
- Tested Edit details and Finish/clear.
- Copied the generated message and compared it character-for-character with the preview.

### Demo safety

- Confirmed `demoMode: true`, WhatsApp `enabled: false` and an empty authorized number.
- Checked for the absence of live WhatsApp, telephone and email ordering links.
- Confirmed the WhatsApp action stays hidden with no `href` before and after message generation.
- Instrumented `fetch`, `XMLHttpRequest` and `navigator.sendBeacon`; no checkout transmission occurred.
- Monitored requests; no POST or external customer-data request occurred.
- Confirmed fictional name, phone and location were not written to local or session storage.
- Checked that no payment fields, provider embeds or payment requests exist.
- Verified generated messages contain **NOT SENT**, illustrative-pricing and no-payment disclosures.
- Confirmed the research phone remains display-only and no restaurant contact was made.

### Gallery

- Loaded all gallery thumbnails and full images.
- Opened the lightbox and verified the decoded image and counter.
- Tested Previous, Next and first/last wrapping.
- Tested left/right keyboard controls, mobile swipe, close button and Escape.
- Checked focus restoration and dialog fit at all required viewports.

## 5. Responsive results

| Viewport | Page and assets | Navigation | Cart and checkout | Gallery | Overflow and layout |
|---|---|---|---|---|---|
| 360 × 800 | Pass | Mobile behaviour pass | Fit, totals and touch controls pass | Fit and image decode pass | No page/internal horizontal overflow |
| 390 × 844 | Pass | Mobile behaviour pass | Fit, totals and touch controls pass | Fit and image decode pass | No page/internal horizontal overflow |
| 768 × 1024 | Pass | Mobile/tablet behaviour pass | Fit, totals and touch controls pass | Fit and image decode pass | No page/internal horizontal overflow |
| 1024 × 768 | Pass | Desktop navigation pass | Dialog fit and totals pass | Fit and image decode pass | No page/internal horizontal overflow |
| 1440 × 1000 | Pass | Desktop navigation pass | Dialog fit and totals pass | Fit and image decode pass | No page/internal horizontal overflow |

The audit also checked headline/hero/footer bounds, non-zero section sizing, image `object-fit` cropping, primary button height, visible header-control size, section captures and mobile interaction layouts. All eleven final sales screenshots were visually reviewed.

## 6. Accessibility results

- axe-core reported **no violations** in six tested states: desktop homepage, cart, checkout, gallery, mobile homepage and open mobile navigation.
- Lighthouse reported **100 accessibility** in both final mobile and desktop runs.
- Manual automated-browser checks covered keyboard navigation, visible focus, modal focus placement/restoration, semantic landmarks, one H1, form labels, image alternatives, button names, carousel state, reduced motion and touch targets.
- Frequent cart touch controls were increased to 44 × 44px on coarse-pointer devices.
- Decorative hero lettering was moved to CSS-generated presentation, and visible button labels were aligned with accessible names.

**Limitation:** these results do not establish complete WCAG compliance. No physical screen-reader study, manual Safari/Firefox audit or physical-device assistive-technology test was performed. Some accessibility rules always require human judgement.

## 7. Performance and code audit

### Final Lighthouse lab runs

| Metric | Mobile | Desktop |
|---|---:|---:|
| Performance score | **90** | **100** |
| Accessibility | **100** | **100** |
| Best practices | **100** | **100** |
| SEO | **91** | **91** |
| First Contentful Paint | 1.4s | 0.3s |
| Largest Contentful Paint | **3.5s** | 0.6s |
| Speed Index | 1.4s | 0.4s |
| Total Blocking Time | 10ms | 0ms |
| Cumulative Layout Shift | 0 | 0.013 |
| Time to Interactive | 3.6s | 0.6s |
| Total page weight in audit | 460 KiB | 609 KiB |

A repeated mobile run on the same final code scored 91, illustrating normal lab-run variation. The values above are the final recorded runs, not a best-score selection.

### Additional loading measurements

The final Playwright local-load run recorded 22 initial resources, **625,877 transferred bytes**, FCP/LCP of 160ms and CLS of **0.0144** before and after a complete image-loading scroll journey. These local timings are not real-user field data.

Responsive image work reduced the comparable local initial transfer from approximately 998 KB earlier in the audit to 626 KB. Lighthouse mobile total page weight decreased from 769 KiB in the initial audit to 460 KiB in the final run.

### Code findings

- All food imagery is local WebP; no individual runtime image exceeds 200 KB.
- Only Fraunces and Manrope are self-hosted; both use `font-display: swap` and preload correctly.
- Eight deferred vanilla-JavaScript modules are used; there is no framework, production package dependency or build requirement.
- No missing local references, duplicate HTML IDs or broken internal anchors were found.
- Responsive `srcset`/`sizes` now serve existing card-sized assets where appropriate; full images remain available for high-density displays and the lightbox.
- The hidden lightbox no longer requests an unused initial image.
- CSS retains intentional refinement overrides and repeated breakpoint selectors. Consolidation and minification remain optional production optimizations; they were not risked during the design freeze.

### Remaining performance/SEO limitations

- Mobile LCP of 3.5s remains above Google’s 2.5s “good” threshold. Further improvement should be approached with profiling rather than an unverified visual change. An above-fold reveal experiment did not materially improve LCP and was reverted.
- The simple local server does not provide production compression, long-lived caching or CDN delivery. Lighthouse identifies these hosting-dependent opportunities.
- Additional responsive image variants, CSS cleanup and production minification could reduce weight further.
- SEO is 91 because the intentionally hidden WhatsApp anchor has no `href` while ordering is disabled. Production canonical/social URLs and final public metadata still require a real domain and launch configuration.
- Lighthouse is a lab audit; no real-user monitoring or field data is available.

## 8. Issues discovered and resolved

| Issue | Classification | Resolution |
|---|---|---|
| Cart increase and remove controls measured 32–34px on touch layouts | Genuine mobile usability issue | Added a coarse-pointer rule giving frequent cart controls 44 × 44px targets. |
| Reduced-motion mode could expose a transient first animation frame, briefly offsetting dialogs | Genuine reduced-motion issue | Reduced-motion mode now disables animation and transitions rather than assigning near-zero durations. Normal-motion design is unchanged. |
| Brand/Add to Cart accessible names did not consistently contain visible labels; decorative lettering triggered a contrast finding | Genuine semantic/accessibility issue | Removed the overriding brand name, aligned button names in both normal/added states and made decorative lettering CSS-generated. |
| Hidden lightbox requested an image before use | Genuine avoidable load | Removed the initial source; the full source is assigned when the lightbox opens. |
| Full hero/About images were used where existing smaller assets were sufficient | Genuine loading inefficiency | Added responsive sources and sizes; removed redundant carousel preloading that would have defeated them. |
| Fallback image requests could begin before responsive candidate selection | Loading implementation issue | Put responsive candidates before fallback `src` attributes and verified selected assets through network traces and decoding. |
| Menu audit initially retained a category filter; image audit did not wait for native lazy loading | Test-harness artefacts | Reset test state and added explicit per-image scrolling/waiting. No website defect was present. |
| Deliberate reload produced `ERR_ABORTED` image requests | Navigation/test-harness artefact | Distinguished navigation cancellation from unresolved failures while retaining independent asset decode checks. |

## 9. Remaining limitations

- All dishes, prices, descriptions and concept photography remain illustrative and require restaurant replacement/approval.
- Logo, business story, exact address, map pin, hours, social links and production contact information remain restaurant-owned inputs.
- No real ordering, payment collection, backend order storage, customer accounts or restaurant notification exists.
- WhatsApp remains disabled and requires explicit authorization and a verified restaurant-owned number.
- Testing was performed in Chromium, not physical Android/iOS devices, Safari or Firefox.
- Automated accessibility checks do not replace manual assistive-technology testing.
- Production domain, deployment, monitoring, backup, privacy wording and long-term content-maintenance decisions remain open.
- No public deployment, restaurant contact, external service change or paid activation occurred.

## 10. Presentation package validation

- Six desktop and five mobile screenshots were captured from the final build and visually reviewed.
- The PDF was rendered back into page images and reviewed, not only checked as HTML.
- PyMuPDF confirmed exactly **six 16:9 pages** at 960 × 540 points.
- All eleven screenshots are embedded across the PDF: 2, 2, 2, 3, 2 and 0 images on pages 1–6 respectively; page 6 is the requirements/next-step page.
- PDF title, author, subject and keywords identify Enkayjay Digital Solutions and the independent-concept status.
- The editable source is included as `sales-presentation/presentation-source.html`.

## 11. Evidence files

- `tests/final-qa.js` — independent release suite
- `tests/final-qa-results.json` — machine-readable assertions, environments and metrics
- `tests/final-qa.log` — final 186-assertion run
- `tests/legacy-regression.log` — separate 83-assertion regression run
- `tests/lighthouse-results.json` — final mobile/desktop Lighthouse summaries
- `sales-presentation/screenshots/` — final clean desktop/mobile captures

**Final release assertion count:** 186 passed, 0 failed.  
**Live ordering status:** intentionally disabled.  
**Deployment status:** local preview only.
