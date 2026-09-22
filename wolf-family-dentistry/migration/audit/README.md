# Domain cutover content audit — September 22, 2026

## Outcome

All eight published content pages and all 17 distinct hyperlink destinations found across their headers, bodies and footers are represented in the redesigned site. There were 21 raw href spellings; four differed only by relative/absolute URL or trailing slash. The sole intentional destination change is **Review Us**, which now goes directly to the same practice's Google review page instead of through the old agency's service. Its label is unchanged.

The page API, page sitemap, all page links, and public post API were cross-checked. Eight pages and no blog posts were returned. A fresh copy comparison against today's crawl passed all eight pages at five screen widths. The new design and wording remain intact.

## Files preserved

- **One PDF:** `/wp-content/uploads/2019/04/Patient-Registration-Forms.pdf`. Eight pages, 24,336,088 bytes, no encryption, JavaScript, interactive form fields, or embedded hyperlink annotations. Its original bytes and URL are retained. First and last pages rendered successfully for visual verification.
- **65 accessible public media records:** every original source file was downloaded, including older practice/team/office photographs and unused media. They remain at their original `/wp-content/uploads/...` paths. Additional page-referenced image renditions and an unscaled original bring the upload backup to **91 files**, totaling 42,307,864 bytes.
- **Practice video, poster and captions:** three more local files. The original player offers only its `lrg` resolution, decoded as 720 × 406, approximately 67.968 seconds. Video playback and all 31 caption cues were checked locally. The source caption file had an invalid first-cue start time and one missing millisecond suffix; those two timing syntax issues were corrected, with all caption wording preserved.
- **Total: 94 archived media/document files** served from the new site. Source URLs, local paths, sizes and SHA-256 hashes are recorded in `archive-manifest.json` and `video-manifest.json`.

The public media API advertises 66 total records but returns only 65 accessible records. An ascending-ID query and two paginated queries returned the same 65 IDs; the PDF-only query returned the same single PDF. No additional accessible media item was found. This archive cannot include private, unlisted, deleted, or otherwise inaccessible WordPress data, submissions, credentials, or server-side configuration.

## Old-agency dependencies removed

1. The homepage's e·LocalLink iframe is replaced by a native video player serving the video, poster and captions locally. It no longer relies on `elocallink.tv`, `vid.hellonetcdn.com`, or the agency player scripts.
2. **Review Us** goes directly to `https://search.google.com/local/writereview?placeid=ChIJsWU_R3oOEYgRmKQ2NyKTUWE`. This exact destination and business Place ID were extracted from the current agency review page, not guessed. Google prompts signed-out visitors to sign in as expected.
3. Page images, original upload paths, PDF and review text are local. WordPress and Trustindex are not needed to display them. Reviews remain a static snapshot.

The existing NEXT! Ad Agency and CGI/e·LocalLink credit links remain because the requested copy is preserved. They are ordinary outgoing attribution links, not dependencies for rendering the website.

## Link checks and external services

- All local page, PDF and media URLs were checked, and archived bytes were compared against their SHA-256 records.
- Google directions resolves to Wolf Family Dentistry at the original location.
- The direct Google review link resolves to Google's sign-in flow with the correct practice Place ID.
- Both agency-credit destinations responded successfully; the CGI address redirects to `cgidigital.com`.
- **Hybridge:** the original `https://hybridgeimplants.com/` link is preserved. Its server returns HTTP 403 to the checker and presents a Cloudflare challenge in the browser. It cannot be marked as a verified accessible destination from this automated audit; manual review is still required.
- **Cherry:** the original merchant slug `wolf-family-dentistry` and provider-hosted calculator remain. A 2,000-to-3,000 example-amount change updated payment options on both sites. The current Cherry script emits an `IntersectionObserver` exception on both the original and new sites; the calculator continued to operate. This is recorded separately as an existing provider issue, not hidden as a clean third-party error result. The original site also emitted an additional loader conflict that was not observed on the new site.
- Google Maps, Google Fonts, Cherry and the external Hybridge information site remain independent third-party services. Their future availability cannot be guaranteed by copying website files. Cherry account ownership/access needs to remain with the practice.
- Both source email links and the phone link are retained. No calls, emails, reviews, contact submissions or financing applications were sent.

## Shutdown simulation

`scripts/cutover-check.mjs` blocks the old domain and agency hosts while opening every new page, compares all source hyperlink destinations, verifies each archived file's served bytes, and plays the local video with captions. See `cutover-report.json` for the machine-readable result, including any separately recorded source-provider errors.

## Before publishing

- The practice's Jotform `262646850204052` is now embedded on the contact page. Verify submission delivery, notification receipt and staff access before launch; no test submission has been sent.
- Preserve existing email DNS records when pointing the website domain to its new host. A read-only snapshot of current public A/AAAA/MX/TXT/NS and www records is saved in `source/dns-before-cutover.txt`. This snapshot does not prove access to the mailbox itself.
- Check the Hybridge link manually and keep access to the practice's Cherry account.
- Production deployment, domain changes and final checks on the production hostname are still pending. No DNS was changed by this audit.

## Evidence and reproducible checks

- `source/`: today's eight page captures, public page/post/media/PDF API responses, original video player/caption responses, review-page destination evidence, DNS snapshot.
- `archive-manifest.json`: every captured source page and original hyperlink/resource inventory, plus 91 downloaded upload files and hashes.
- `video-manifest.json`: three video assets and provenance.
- `external-links.json`: external HTTP results, including redirects and the Hybridge limitation.
- `cherry-check.json`: original/new calculator interaction and original/new provider errors.
- `cutover-report.json`: link preservation, served asset integrity and old-host blocking results.
- `../source/`: earlier migration baseline; preserved for comparison.

```sh
npm run qa:migration -- http://localhost:4324 ../migration/audit/source/
node wolf-family-dentistry/scripts/check-cherry.mjs http://localhost:4324
node wolf-family-dentistry/scripts/cutover-check.mjs http://localhost:4324
```
