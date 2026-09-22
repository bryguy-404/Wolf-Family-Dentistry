# Build this site end-to-end — autonomous loop

You are Claude Code, running in the folder that contains this unzipped hand-off bundle. Your job is to turn the bundle into a finished, building Astro site that faithfully reproduces the approved design — **looping on a quality gate until it passes**, without asking me to drive each step.

## What's in this bundle

- `CLAUDE_KICKOFF.md` — Phase 1: how to scaffold the Astro project.
- `BUILD_PROMPT.md` — Phase 2: how to rebuild the homepage from the design.
- `BLUEPRINT.md` — the design intent (vibe, sections, type, palette, spacing).
- `theme.config.ts` — extracted design tokens.
- `design/index.html` — the **frozen, approved mockup**. This is ground truth. Never edit it.
- `visual-diff.mjs` — the **quality gate**. It scores your built site against `design/index.html` and exits 0 (pass) or non-zero (fail). You call it; it never edits code.

Read `CLAUDE_KICKOFF.md`, `BUILD_PROMPT.md`, and `BLUEPRINT.md` in full before starting.

## The loop

Run these phases in order. Do not skip the gate.

### Phase 1 — Scaffold (once)
1. Follow `CLAUDE_KICKOFF.md` to scaffold the Astro project (TypeScript + Tailwind + MDX) into its `wolf-family-dentistry/` folder. Confirm the dev server boots cleanly, then stop it.
2. Move the hand-off files **into** the scaffolded project folder so everything lives in one place: `BLUEPRINT.md`, `theme.config.ts`, `design/`, `BUILD_PROMPT.md`, and `visual-diff.mjs`.
3. Install the gate's dependencies inside the project:
   ```bash
   npm i -D playwright pixelmatch pngjs @anthropic-ai/sdk
   npx playwright install chromium
   ```
4. `cd` into the project folder. Everything below runs from there.

### Phase 2 — Build (first pass)
5. Follow `BUILD_PROMPT.md` to rebuild the homepage as Astro components, faithful to `design/index.html` and `BLUEPRINT.md`. Use the mockup's literal copy. Wire the theme tokens. Make it responsive.

### Phase 3 — Gate + repair loop (max 4 passes total)
Repeat until the gate passes or you hit the pass cap (`MAX_PASSES = 4`, i.e. the first build plus three repairs):

6. Build and serve the site:
   ```bash
   npm run build
   npm run preview   # Astro serves on http://localhost:4321
   ```
   Run `preview` in the background; you only need it reachable while the gate runs.
7. Run the gate:
   ```bash
   node visual-diff.mjs \
     --built http://localhost:4321 \
     --design ./design/index.html \
     --blueprint ./BLUEPRINT.md \
     --threshold 85
   ```
8. Stop the preview server.
9. Branch on the gate:
   - **Exit code 0 (PASS):** the build is faithful. Exit the loop — go to "Done."
   - **Exit code 1 (FAIL):** open `./.loop/qa-report.json`. The `repairForBuilder` field and each viewport's `issues` tell you exactly what diverged and how to fix it. Make **only** those changes, targeting the named sections/breakpoints. Then return to step 6.
   - **Exit code 2 (could not run):** the gate itself failed (preview server not up, missing dep, missing `ANTHROPIC_API_KEY`). Fix that cause and re-run the gate — do **not** count this as a repair pass.

10. If you reach `MAX_PASSES` without a pass, **stop and report** to me: the latest `minScore`, the unresolved issues from `qa-report.json`, and what you tried. Do not keep looping. Do not lower the threshold to force a pass.

## Hard rules — stop and ask me first

These are outside the loop. Never do them autonomously; pause and ask:
1. **No `git push` / no creating or connecting a GitHub repo.**
2. **No deploying** (Cloudflare Pages, Railway, anywhere).
3. **No secrets**: do not create, request, paste, or commit `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_TO_EMAIL`, or any other key. If `design/index.html` includes a form, build the `functions/api/contact.ts` endpoint per `BUILD_PROMPT.md` reading values from `env`, but leave the secrets for me to set.
4. **No changing the gate's threshold or editing `visual-diff.mjs`** to make a build pass.

## What NOT to do

1. Do not edit `design/index.html` — it is the frozen target.
2. Do not invent copy; use the mockup's wording (only fill genuine gaps).
3. Do not add dependencies beyond what `CLAUDE_KICKOFF.md` and the gate require.
4. Do not skip the gate or declare success on your own judgment — "passes" means **exit code 0**, nothing else.

## Done

When the gate passes (or you hit the cap and reported), give me a short summary:
- final gate result (pass/fail) and `minScore` per breakpoint,
- how many passes it took,
- any issues you couldn't resolve,
- the exact commands I should run to push and deploy (but do not run them).
