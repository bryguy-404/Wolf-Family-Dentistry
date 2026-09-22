# Wolf Family Dentistry

The Astro site lives in `wolf-family-dentistry/`. Commands work from this workspace root. Node 22.12+ is required.

GitHub repository: https://github.com/bryguy-404/Wolf-Family-Dentistry. Source code, site media, patient PDF and migration evidence are versioned. Dependencies, build output, local QA screenshots, environment secrets and duplicate ZIP backups are excluded. The ZIP backup remains available locally under `wolf-family-dentistry/migration/backups/`.

```sh
npm install
npm run dev -- --background
npm run check
npm run build
```

Use the URL printed by Astro; it chooses an available port. The migration preview was verified at `http://localhost:4323`. Manage the server with `npm run astro --workspace=wolf-family-dentistry -- dev status` (or `logs` / `stop`). Static output is in `wolf-family-dentistry/dist/`.

## Content migration

The new navy/green/plum design now includes all eight content pages from https://wolffamilydentistryin.com/: `/`, `/about-us/`, `/maintain/`, `/restore/`, `/testimonials/`, `/contact-us/`, `/cherry-payment/`, and `/sitemap/`.

[Migration notes](wolf-family-dentistry/migration/README.md) document the crawl, source snapshots, exact-copy approach, image provenance, source inconsistencies and outstanding launch work. Original wording, page titles, descriptions and internal slugs are preserved. The audit intentionally changes the agency-hosted Review Us destination to the same practice’s direct Google review link, retaining the original label. The patient PDF is served at its original path. Existing photos were sufficient; no generated images were needed.

`src/data/source-content.json` is extracted from the frozen original HTML by `scripts/extract-source.mjs`. `SourceCopy.astro` changes heading structure and presentation without rewriting text. The original design mockup, blueprint and AI visual gate remain unchanged as historical references; their placeholder copy is superseded by this migration.

## Verification

```sh
npm run qa:migration -- http://localhost:4323
# qa:browser runs the same migration checks
```

On September 22, 2026:

- `npm run check`: zero errors and warnings; one pre-existing unused-import hint in the frozen visual gate.
- `npm run build`: all eight routes built successfully.
- Content audit: all 81 source text blocks across the original pages (including repeated contact blocks), five reviews on each of two pages, metadata, HTML sitemap and original body link destinations matched. Only HTML whitespace and heading levels change.
- All eight pages passed at 320, 375, 768, 1024 and 1280px without horizontal overflow or first-party JavaScript exceptions. Images decoded; internal links and the PDF returned successfully.
- Mobile-menu keyboard operation, Escape, route navigation, FAQ expansion and no-JavaScript navigation/FAQ behavior passed.
- Live Cherry content matched the captured original widget text. Changing the example amount from 2,000 to 3,000 updated its payment options. Its live mobile layout had no overflow.

Reports and desktop/mobile screenshots are saved in `wolf-family-dentistry/.loop/migration/`. The local audit isolates third-party frames and Cherry loading; live Cherry verification was performed separately. Source review cards are a static snapshot and do not automatically refresh. The practice video, poster and captions are now hosted locally. Maps, fonts and Cherry remain independent external services. See the [domain cutover audit](wolf-family-dentistry/migration/audit/README.md) for the complete link/file inventory and verification results.

The legacy `qa:visual` command uses the old mockup's copy and an external `ANTHROPIC_API_KEY`; it is not the acceptance check for this content migration. No new AI fidelity score is claimed.

## Contact form and launch

The contact page embeds the practice-provided Jotform `262646850204052` using its official JavaScript embed in `src/components/ContactForm.astro`. Jotform manages the fields, validation, submission, confirmation, notifications and form appearance. The original surrounding page copy and confidentiality notice are preserved. A direct-form link and phone number remain available if the embed cannot load.

No API key, WordPress access or `PUBLIC_CONTACT_FORM_ENDPOINT` is required. Edit the form and recipient settings in the practice's Jotform account. Actual submission delivery, notification receipt and staff access still need an explicitly authorized end-to-end check before launch; embedding alone does not verify those settings. No messages have been submitted or claimed as delivered.

The embed loaded at 320, 375, 768 and 1280px without horizontal overflow or browser exceptions; Submit was visible and enabled, and the no-JavaScript fallback link remained available. Evidence is in `wolf-family-dentistry/.loop/jotform/`. The existing eight-page/five-width migration audit also passed. Jotform's supplied form currently makes phone, email and message optional, unlike the old form; review those requirements in Jotform. Iframe scrolling is enabled as a fallback when the provider's automatic height has not caught up with a viewport resize.

The source contains two different email addresses and an old agency copyright credit; these are preserved and documented for review. Production deployment and DNS changes remain pending.

Cloudflare Pages uses the repository root, `npm run build`, and output directory `wolf-family-dentistry/dist`, with Node 22. The GitHub repository is connected to Cloudflare for deployment.

The root lockfile includes the optional native binaries for Linux and macOS. If npm regenerates it from an existing Mac `node_modules` folder, it can omit Linux bindings and break Cloudflare's clean install. Regenerate in a clean temporary workspace without `node_modules`, retain the existing dependency versions, and verify with a fresh Linux `npm ci` and build before committing a lockfile change.

The September 22 deployment fix was verified in a clean Linux x64 container with Node 22.22.0 and npm 10.9.2: `npm ci`, `npm run check` and `npm run build` passed, producing all eight pages. The previous lockfile reproduced the native-binding failure in Linux; no existing package versions were removed by the repaired lockfile.

## Domain cutover audit

The deeper audit archived 91 upload files plus the original video, poster and captions (94 files total), verified all 17 distinct source hyperlink destinations are represented, and removed the agency-hosted video and review gateway dependencies. The patient PDF is the sole PDF found in the public media index and page links. Full scope, evidence and limitations are in [the audit report](wolf-family-dentistry/migration/audit/README.md). The original Hybridge link requires a manual check because it presents a security challenge. Preserve the existing email DNS records during cutover.
