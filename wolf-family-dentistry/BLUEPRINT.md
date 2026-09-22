# Wolf Family Dentistry — Design Blueprint

## Overall direction & vibe
A warm, trustworthy family-dentistry brand aimed at multi-generational patients in La Porte, Indiana. Deep navy grounds the design in established credibility while fresh green CTAs and soft sage tints keep everything calm and approachable. Generous rounded corners, pill-shaped buttons, and airy spacing express a gentle, modern, comfort-first practice that has served its community since 1988.

## Section-by-section breakdown

### Header (sticky)
- Sticky top bar (z-50), white background, subtle bottom border (navy at 10% opacity). Height 80px on mobile, 96px from the sm breakpoint.
- max-w-7xl flex row: logo image at left (h-12 mobile / h-14 sm, max-width ~185-215px), desktop nav (hidden below lg) with links About, Dental Care, Your Experience, Why Wolf, and Patient Forms (external), then a bold phone link '(219) 362-3730' and a solid green pill CTA 'Request Appointment' (hover darkens to #4F8445).
- Nav links: 15px, semibold, navy, hover color shifts to green.
- Mobile (below lg): a 44px circular outlined hamburger button toggles a dropdown panel of stacked links (rounded-xl, sage hover fill) ending in a full-width green pill call CTA. A small script toggles the hidden class plus aria-expanded and closes the menu when any link is clicked.

### Hero
- Full-bleed navy section, min-height 650px (720px at lg), with an absolutely positioned cover photo (object-position center 35%; the mockup uses a placeholder src to be replaced with real practice photography).
- Scrim: flat navy at 75% opacity on mobile; from lg it becomes a left-to-right gradient (solid navy to navy/80 to navy/35) so copy sits over the darker left half.
- Decorative 288px circle outline (border white/20) bleeding off the top-right edge.
- Content block (white, left-aligned, max-w-3xl): eyebrow row with a green sparkle glyph and uppercase micro-label (12px bold, 0.24em tracking) 'Wolf Family Dentistry · La Porte'; giant display h1 up to 72px (extrabold, line-height 1.04, letter-spacing -0.045em, capped at 15ch): 'Comfortable care for every smile in your family.'; supporting paragraph at lg/xl in white/85.
- CTA row (column on mobile, row at sm): primary green pill 'Request an Appointment' with an up-right arrow inside a 32px white circular chip, hover lift (-translate-y-0.5) and darker green; secondary pill outlined white/40 'Explore Our Care' that inverts to white background with navy text on hover.
- Beneath the CTAs: a glassmorphism trust pill (border white/25, bg white/10, backdrop-blur) with a small green dot and the line 'Trusted by La Porte families since 1988'.

### Highlights bar (overlapping stat strip)
- Overlaps the hero via -mt-9 with relative z-20 so it straddles the hero/body seam. max-w-6xl white card, rounded-3xl (24px), signature soft shadow, 3 columns at md with navy/10 divider borders (cells stack with top borders on mobile).
- Each cell: green uppercase micro-label (0.2em tracking) above a bold display-font line — 'Serving La Porte since 1988', 'Gentle, honest, modern care', and a tel: cell with the phone number, an arrow that nudges right on hover, and a sage hover background.

### About (id: about)
- Two-column grid at lg (gap-16), py-24 / sm:py-32.
- Left: layered photo collage — main 4:5 portrait image at 88% width, 32px radius, soft shadow; a second 16:10 photo inside a white padded card (28px outer / 20px inner radius) overlapping the bottom-right at 72% width; a 112px plum circular badge pinned near the top-right reading 'Since 1988' (uppercase, wide tracking, display-font year).
- Right: green uppercase eyebrow, h2 'Modern dentistry, with the warmth of family.' (4xl to 5xl, extrabold, -0.035em tracking), lg muted lead paragraph, then a 2-column (at sm) grid of four sage rounded-2xl benefit chips with green dot bullets and bold labels (calm welcoming visits, clear honest guidance, modern effective care, treated like family), followed by a bold plum arrow link that turns green on hover.

### Services (id: services)
- Ivory (#F7F9F6) band, py-24 / sm:py-28. Intro block (max-w-3xl): green eyebrow 'Care for your whole smile' plus a large h2.
- 3-column grid at md (gap-5) of white cards: 28px radius, 1px navy/10 border, p-7; hover lifts the card (-translate-y-1) and adds the soft shadow.
- Card anatomy: 48px circular numbered badge (01 on sage with green text, 02 on #F0E9F3 with plum text, 03 on #E9EDF5 with navy text), 2xl display-font title (Maintain / Restore / Enhance), muted supporting copy (leading-7), and a bold tel: arrow link color-matched to the badge accent.

### Social proof + experience (ids: reviews, experience)
- Asymmetric lg grid (0.8fr / 1.2fr, gap-8), py-24.
- Left panel: solid navy, 32px radius, p-9 / sm:p-12 — green eyebrow 'Local trust', a huge 7xl extrabold display figure '1988', and a white/75 caption about the founding year.
- Right panel: white with a navy/10 border, 32px radius — green eyebrow, h2 'Care built around how you feel.', muted lg paragraph, three sage pill tags (Comfort-first, Family-focused, Clear communication), and an external plum arrow link to Google reviews (new tab) that turns green on hover.

### CTA band
- Sits inside an ivory wrapper (pb-24): a navy panel, 32px radius, px-7 / sm:px-12, py-12, overflow hidden, becoming a flex row with space-between at lg.
- Decorative filled plum circle at 60% opacity (256px) bleeding off the top-right corner.
- Left: green eyebrow 'Ready when you are' plus a 3xl/4xl extrabold h2 'Let’s make your next dental visit feel easier.' Right: green pill 'Call (219) 362-3730' and an outlined white/35 pill 'Patient Forms' that inverts to white/navy on hover.

### Footer
- Deeper navy (#0F1B43) background, white text. 3-column md grid (1.2fr / 0.8fr / 0.8fr), py-12.
- Brand column: logo inside a white rounded-2xl padded card so it stays legible on dark, plus a white/65 one-line tagline.
- Explore and Connect columns: bold display-font headings over white/70 link stacks (section anchors, location, phone, patient forms) that brighten to full white on hover.
- Bottom bar: top border white/10, centered small white/50 copyright.

## Typography
- Headings/display: 'Plus Jakarta Sans' (Google Fonts, weights 600/700/800) — h1-h3, card titles, stat figures, highlight lines, footer column labels.
- Body/UI: 'Source Sans 3' (Google Fonts, weights 400/500/600/700) — default body font, rendered antialiased. Load both via Google Fonts with preconnect.
- h1: 3rem mobile, 3.75rem at sm, 72px at lg; weight 800; line-height 1.04; letter-spacing -0.045em; width capped at 15ch.
- h2: 2.25rem to 3rem; weight 800; letter-spacing -0.035em; tight leading.
- Eyebrow labels: 0.75rem, bold, uppercase, letter-spacing 0.24em (0.2em in the highlights bar), always green.
- Body copy: 1.125rem with 2rem line-height (leading-8) for lead paragraphs in the muted gray-blue; card copy uses leading-7; the hero paragraph scales to 1.25rem at sm.
- Nav links are 15px semibold; buttons and inline links are bold (700); the stat figure is text-7xl extrabold.

## Color palette
- #17285E navy — primary brand: default text color, hero/stat/CTA panel backgrounds, borders at 10-15% opacity.
- #5F9552 green — action accent: CTA buttons, eyebrows, hover states, bullets, trust dot, badge 01 text.
- #4F8445 dark green — hover state for green buttons.
- #502A64 plum — secondary accent: circular badge, CTA decorative circle, tertiary links, badge 02 accent.
- #F7F9F6 ivory — alternate section surface (services band, CTA wrapper).
- #EAF1E7 sage — soft tint surface: benefit chips, pill tags, hover fills, badge 01 background, text-selection background.
- #637083 muted — secondary body text.
- #FFFFFF white — page background, cards, header; also used at 10-85% opacity for text and borders on navy.
- #0F1B43 deep navy — footer background.
- #F0E9F3 plum tint — service badge 02 background.
- #E9EDF5 navy tint — service badge 03 background.
- Shadow token: 0 24px 70px rgba(23,40,94,.14) (soft).

## Spacing & layout
- Containers: max-w-7xl (1280px) for the header and most sections; the highlights bar uses max-w-6xl. Horizontal padding px-5 on mobile, px-8 from sm.
- Vertical rhythm: major sections py-24 (6rem), stepping to sm:py-28 or sm:py-32; the CTA wrapper uses pb-24; footer py-12; header height h-20 to sm:h-24.
- Anchored sections use scroll-mt-28 and the html element has smooth scrolling enabled.
- Grids: 3 columns at md for highlights and services; 2 columns at lg for about; asymmetric 0.8fr/1.2fr at lg for the proof pair; footer 1.2fr/0.8fr/0.8fr at md; about benefit chips go 2-up at sm.
- Overlap trick: the highlights bar is pulled up with -mt-9 and relative z-20 over the hero seam.
- Breakpoints in play: sm (640px), md (768px), lg (1024px). The desktop nav, hero gradient, and taller hero all switch on at lg.
- The body uses overflow-x-hidden so decorative circles can bleed past the viewport safely.

## Unique visual treatments
- Signature soft shadow (0 24px 70px rgba(23,40,94,.14)) on cards, collage images, and the highlights bar — define it as a custom Tailwind boxShadow token named soft.
- Very round geometry: fully rounded pill buttons and tags, 28-32px card radii, 16px chips, 24px highlights bar.
- Glassmorphism trust pill in the hero (white/10 fill, white/25 border, backdrop-blur).
- Decorative offset circles: an outlined white/20 circle in the hero and a filled plum/60 circle in the CTA band, both bleeding beyond overflow-hidden parents.
- Layered about collage: overlapping white-framed secondary photo plus a plum circular Since 1988 badge.
- Directional hero scrim: flat navy/75 overlay on mobile that becomes a left-to-right navy gradient at lg over a full-bleed photo.
- Micro-interactions: hover lift on the primary CTA (-translate-y-0.5) and service cards (-translate-y-1 plus shadow), arrow nudge (translate-x-1), outlined buttons inverting to solid white with navy text, links shifting to green on hover.
- Inline arrow glyphs (right and up-right) as affordances; the hero CTA embeds its arrow inside a white circular chip.
- A green sparkle glyph prefixes the hero eyebrow; a small green status dot sits in the trust pill.
- Custom text selection (sage background, navy text) and smooth anchor scrolling.
- Numbered circular service badges with color-coded tints (sage/green, plum tint/plum, navy tint/navy).
- All image sources in the mockup are placeholders; swap in the real logo and photography while preserving aspect ratios and object positions.
