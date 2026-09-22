# Content migration

Source: https://wolffamilydentistryin.com/ — captured September 22, 2026.

## Scope and sequence

1. Crawl the XML sitemap and linked pages; freeze HTML, metadata, images, PDF and widget configuration.
2. Use the existing navy/green/plum design for the homepage, shared navigation/footer, and all inner pages. Source wording is authoritative, including punctuation and source inconsistencies.
3. Compare rendered content against frozen source modules, verify every original URL and internal link, and inspect desktop/mobile layouts.

| URL | Content |
| --- | --- |
| `/` | Original hero, three page summaries, mission, video, dental care, experience, forms, CTA, five reviews |
| `/about-us/` | History, team, ten FAQs, practice introduction and CTA |
| `/maintain/` | Introduction and all five preventive service sections |
| `/restore/` | Introduction and all five restorative/cosmetic sections |
| `/testimonials/` | All five reviews captured from the existing widget |
| `/contact-us/` | Introduction, contact form fields, confidentiality notice and contact details |
| `/cherry-payment/` | Original live Cherry hero, calculator, how-it-works and FAQ modules |
| `/sitemap/` | Original sitemap content |

The page sitemap lists these eight routes; the site's navigation and body links reveal no additional content pages. The public WordPress page API independently confirmed exactly these eight published pages (saved in `source/public-pages.json`). `wpa-stats-type-sitemap.xml` is an accessibility-plugin statistics sitemap, not a content-page list. The original PDF path is `/wp-content/uploads/2019/04/Patient-Registration-Forms.pdf` (there is no linked `/patient-forms/` page).

## Content provenance

`source/*.html` are the frozen original pages. `scripts/extract-source.mjs` parses them with scripts and network requests disabled, removes legacy styling, and creates `src/data/source-content.json`. Layout components select original modules by source page and module index. Internal links become local links with the same slugs. No website copy is generated or rewritten. Reviews are a static snapshot; they do not claim automatic synchronization. Cherry retains its provider-hosted live content, so future provider updates may differ from the captured text.

Existing practice and stock photographs are reused. No generated staff, office, or patient photographs are introduced.

## Source details preserved for review

- The About FAQ says `wolffamilydentistry@live.com`; shared contact details say `office@wolffamilydentistryin.com`. Both are preserved.
- The existing copyright/agency attribution is preserved verbatim.
- The original HTML sitemap does not list Cherry Payment; the primary/footer navigation and XML sitemap do.
- The old WordPress form is replaced by the practice-provided Jotform `262646850204052`. Jotform now controls the form's fields and wording; the surrounding source copy and confidentiality notice remain exact. Notification receipt and staff access still require an authorized submission test before launch.

No production deployment or DNS changes are included.

## Verification results

- `npm run check` and `npm run build` passed (eight routes).
- `npm run qa:migration -- http://localhost:4323` passed all eight routes at 320, 375, 768, 1024 and 1280px. It independently compares the rendered text with the original WordPress HTML rather than with the generated JSON.
- All 81 source text blocks, five review texts on both review-bearing pages, metadata, HTML sitemap, and original body links matched. All nine unique local link targets (eight pages plus the original PDF) returned successfully.
- No horizontal overflow or first-party JavaScript exceptions. Mobile keyboard navigation, Escape, FAQ expansion, and no-JavaScript navigation/FAQs passed.
- The live Cherry widget text matched `source/cherry-rendered-text.json`; its calculator updated when the example amount changed, and its mobile layout fit the viewport.
- Reports and screenshots: `../.loop/migration/` (local QA artifacts, ignored by Git).

## Presentation changes with no copy rewrite

The homepage's original hero line is now the H1, and subsequent section headings use H2. FAQ answers use native accessible details/summary elements. All five existing reviews are shown in full, so the legacy widget's truncation/load-more controls are unnecessary. The shared contact details are styled as the new footer. The contact form uses the practice's supplied Jotform embed, with a direct-form link and phone fallback.

## Deeper pre-cutover audit

See [the domain cutover audit](audit/README.md) for a fresh complete link/media crawl, 94 preserved media/document files, a local replacement for the agency video player, and the verified direct Google Review Us destination. This follow-up supersedes the earlier notes about retaining the agency video embed and every external link unchanged. It also documents the provider issues and remaining launch checks.
