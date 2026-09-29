# Google Ads call landing page

Preview route: `/dentist-la-porte/`. Privacy notice: `/landing-privacy/`.
The existing main website and its navigation are unchanged. These routes use their own layout and stylesheet and are not added to the sitemap. Both are `noindex, follow` by default for this dedicated campaign.

## Brief implemented

- Calls are the only conversion action. Non-clickable logo, no site navigation or forms; privacy link and the map provider's required controls are the exceptions to the no-exit-links guidance.
- All eleven phone links use `tel:+12193623730`, with placement-specific events. Sticky desktop header and mobile bottom bar; primary call button appears before imagery on phones.
- Navy `#17285e`, green `#4e8244`, self-hosted Lora and Nunito Sans, with their open font licenses. No Avenir license assumed.
- Existing practice photos, responsive WebP assets, original team photo already published on the main site, and locally hosted practice video with captions and `preload="none"`.
- Dental cleanings/checkups, general dentistry, restorations, whitening, Dr. Wolf's history, the four supplied Google review texts, map, address, and hours.
- Dentist JSON-LD with coordinates from the archived original site. No invented aggregate rating or patient counts.
- Office hours calculated in `America/Chicago` (La Porte), including daylight-saving time. Outside-hours wording asks visitors to call during office hours; it does not promise voicemail or a callback. Holiday closures require future schedule updates.
- Optional allowlisted headlines: `?kw=cleaning`, `?kw=general`, `?kw=appointment`. Unknown input keeps the standard headline. Campaign parameters remain in the URL and survive the privacy-page round trip with JavaScript enabled.

## Google measurement setup

Set the four optional build environment variables documented in `.env.example`, then rebuild:

| Variable | Supplied by |
| --- | --- |
| `PUBLIC_LANDING_GA4_ID` | GA4 web data stream (`G-…`) |
| `PUBLIC_LANDING_ADS_ID` | Google Ads Google tag (`AW-…`) |
| `PUBLIC_LANDING_ADS_CLICK_LABEL` | Conversion label for phone-link clicks |
| `PUBLIC_LANDING_ADS_CALL_LABEL` | Separate conversion label for calls from the website |

The landing page intentionally uses a separate layout and does not load the main site's existing GTM container. Its contents and campaign tags were not available to inspect. Do not add another GTM/gtag installation without checking for duplicate events.

Every call click emits a local `dataLayer` event `phone_call_click` with `cta_location`, `page_path`, and `link_url`. With a configured GA4 ID it sends one GA4 event. With configured Ads ID/click label it sends one Ads conversion. It never delays dialing if tracking is blocked.

The website-call configuration uses Google's `phone_conversion_callback` to update every visible number and every corresponding `tel:` target. The fallback is always the practice number. Source: [Google's website call conversion documentation](https://support.google.com/google-ads/answer/6095883?hl=en). Actual forwarding numbers and delivery to GA4/Ads require the real account configuration, an eligible ad visit, and a production Tag Assistant check. Mock tests are not proof of account receipt.

Phone-link clicks and connected calls are different conversion actions. Have the campaign owner decide which is primary for bidding to avoid counting the same caller twice. The browser does not persist campaign parameters in its own local/session storage; Google's configured tags may use cookies. Review the privacy notice against the practice's actual data handling and selected measurement configuration before publishing.

## Client items still unresolved in the supplied brief

1. Confirm walk-ins, same-day/emergency availability, and voicemail. Until then, the page promises none of these; pause the walk-in ad keyword unless confirmed. Karyl's historical review remains verbatim and is not a current availability guarantee.
2. Confirm any new patient promotion and accepted insurance plans before adding claims. No invented discount or carrier list is present.
3. Confirm any specific neighboring towns to name. Current copy says La Porte and nearby communities.
4. Confirm current permission to reuse the already-public team photo; team members are not named.
5. Review the privacy notice with the practice and configure actual measurement IDs.
6. Confirm the final HTTPS campaign URL, noindex preference, and production deployment. No production deployment or ad campaign changes were made by this task.

## Verification

```sh
npm run check
npm run build
node scripts/landing-check.mjs http://localhost:4326
```

The browser check verifies six widths (320, 375, 390, 768, 1024, 1440), image decoding, no horizontal overflow, sticky call positioning, phone targets, local click events, attribution across the privacy page, allowlisted headline changes, hours boundaries and daylight-saving dates, no-JavaScript calling, structured data, video playback, and mocked Google Ads/GA4 and forwarding-number behavior. It does not dial the practice or send analytics. Screenshots and report are written to `.loop/landing/`. The embedded map is isolated for deterministic automation; inspect it separately with live network access.

No production PageSpeed Insights score, Google Ads approval, live conversion receipt, or connected phone call is claimed. Run mobile PageSpeed Insights on the final HTTPS URL after tracking is configured. Main-site migration tests are separate and unchanged.
