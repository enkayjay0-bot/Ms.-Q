# Ms. Q Concept Demo — Earlier-Stage Regression Report

> **Latest release audit:** On 1 November 2026, the new independent suite passed **186 assertions with 0 failures**, and this 83-assertion suite was rerun successfully. See `FINAL-QA-REPORT.md` for the current release audit, performance results, fixes and remaining limitations.

**Historical test date:** 31 October 2026  
**Historical result:** All **83 Chromium browser assertions passed**. Static reference, syntax and image checks also passed. No real orders, messages or payments were sent.

## Responsive and runtime checks

| Check | Result |
|---|---|
| 360 × 800 | HTTP 200; no horizontal overflow; clean runtime |
| 390 × 844 | HTTP 200; no horizontal overflow; clean runtime |
| 768 × 1024 | HTTP 200; no horizontal overflow; clean runtime |
| 1024 × 768 | HTTP 200; no horizontal overflow; clean runtime |
| 1440 × 1000 | HTTP 200; no horizontal overflow; clean runtime |
| External front-end requests | None at all five tested sizes |
| Failed asset requests | None |
| JavaScript runtime errors | None |
| Menu and gallery images | All referenced WebP assets load and decode |

A 4-pixel category-rail overflow discovered at 360px was corrected and retained in the responsive regression run.

## Hero carousel and featured rail

- Four hero slides and four direct indicators rendered with exactly one exposed active slide.
- Previous/next and direct-indicator navigation passed.
- Left/right keyboard navigation and mobile swipe passed.
- Slide changes preserved the carousel frame dimensions.
- All four eager-loading hero images decoded successfully.
- Reduced-motion mode disabled transitions and produced an immediate visible slide change.
- Without JavaScript, the fallback hero image remained visible and unavailable carousel controls stayed hidden.
- Featured dishes retained the desktop grid and used an intentional horizontal scroll-snap rail on mobile.
- The carousel is deliberately user-controlled; there is no autoplay.

## Menu and cart

- Four featured items, ten full-menu items and six gallery images rendered correctly.
- All six categories plus All were tested structurally; Local Dishes and Drinks filters were verified by result count.
- Search, clear, reset and empty-results behaviour passed.
- Adding identical products grouped them into one cart line with the correct quantity.
- Quantity increase/decrease, removal, item subtotals and overall totals passed.
- Verified totals included **GH₵258.00**, **GH₵326.00**, **GH₵68.00** and **GH₵124.00** fixtures.
- Cart item IDs and quantities persisted after reload; clearing restored the empty state.

## Checkout and demo safety

- Checkout opened with the correct two-line order summary.
- Required name/phone validation passed.
- Delivery selection conditionally required a location.
- Generated messages contained the fictional customer details, order type, delivery information, items, quantities, sample prices and **GH₵124.00** total.
- Messages explicitly included **NOT SENT**, illustrative-pricing and no-payment disclosures.
- No POST or other transmitting request occurred during checkout.
- No active WhatsApp URL existed before or after message generation.
- Copy returned the complete generated message.
- Edit-details and finish/clear flows passed.

## Gallery, navigation and mobile

- Lightbox open/close, previous/next and first/last wrapping passed.
- Left/right keyboard navigation passed.
- Escape closed the gallery and restored focus.
- Mobile navigation open/close, ARIA state, Escape focus restoration and link navigation passed.
- Mobile cart opened without overflow.
- Mobile gallery swipe advanced correctly without page overflow.

## Accessibility

Automated axe-core WCAG A/AA scans reported **no violations** in all four tested states:

1. Homepage
2. Cart drawer
3. Checkout dialog
4. Gallery lightbox

Small-text contrast issues found during testing were corrected before the final run. Semantic landmarks, labels, keyboard controls, focus states, reduced-motion support and no-JavaScript disclosures were also checked. Automated scans do not replace physical-device and assistive-technology testing.

## Static and visual review

- JavaScript syntax checked for all eight runtime modules and the test suite.
- HTML IDs, internal links, labels, ARIA references and local file references checked.
- Static and generated image paths checked; no missing assets.
- Desktop hero, full page, cart, checkout and gallery visually reviewed.
- Mobile hero, full page, menu images, cart and checkout visually reviewed.
- Refined desktop and mobile hero captures are included as `previews/desktop-preview.png` and `previews/mobile-preview.png`.
- Fraunces + Manrope was selected after comparing Playfair Display + DM Sans and Fraunces + Manrope in the actual layout.
- All concept imagery, fonts and code are local; no hotlinked runtime assets.

## Remaining owner-managed checks

- Test with physical Android/iOS devices and, where available, Safari and Firefox.
- Replace all sample content and concept imagery with approved restaurant material.
- If separately authorized, test live WhatsApp delivery with the restaurant’s consent before enabling it publicly.
- Check production social-sharing previews after absolute public image URLs are configured.

**Known code defects after the final test run:** None.  
**Live ordering status:** Intentionally disabled.  
**Deployment status:** Local preview only; no public deployment performed.
