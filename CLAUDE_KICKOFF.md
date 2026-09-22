# Build the Wolf Family Dentistry Astro site — Phase 1 (Scaffold)

You are Claude Code running in a terminal. **This prompt only handles the project scaffold.** The homepage build happens later in a separate prompt (`BUILD_PROMPT.md`) once the design files are in the workspace.

This is a static Astro marketing site intended for Cloudflare Pages. Do not install `@astrojs/cloudflare`, `wrangler`, or any Cloudflare adapter unless the project explicitly needs SSR, API routes, Cloudflare bindings, KV, D1, or Workers runtime features.

## What to do

Scaffold a fresh Astro project in a new subfolder named `wolf-family-dentistry` (relative to the current working directory). Use the Astro CLI **non-interactively** so the install does not stall on prompts:

```bash
npm create astro@latest wolf-family-dentistry -- --template minimal --typescript strict --install --no-git --skip-houston --yes
```

Then initialize git (Astro skipped this because of `--no-git` above) and add the required integrations, also non-interactively:

```bash
cd wolf-family-dentistry
git init -b main
npx astro add tailwind --yes
npx astro add mdx --yes
```

Before committing, make sure `.gitignore` contains these generated/local-only paths:

```gitignore
.wrangler/
dist/
.astro/
node_modules/
```

Stage everything and create a baseline commit so the user has a clean rollback point:

```bash
git add .
git commit -m "Initial Astro scaffold: TypeScript + Tailwind + MDX"
```

Verify the dev server boots cleanly:

```bash
npm run dev
```

Stop the server after ~5 seconds. If anything errored, fix it and try again. Then report done.

## What NOT to do

- Do **NOT** build the homepage yet.
- Do **NOT** modify `tailwind.config.ts` beyond what `astro add tailwind` produces.
- Do **NOT** add additional dependencies.
- Do **NOT** install `@astrojs/cloudflare`, `wrangler`, or add `wrangler.jsonc` for this static Cloudflare Pages scaffold.

## Cloudflare Pages deploy settings

When this site is pushed to GitHub and connected to Cloudflare Pages, use:

- Build command: `npm run build`
- Build output directory: `dist`

## Hand-off back to the user

When the scaffold is verified, tell the user to:

1. Move `BLUEPRINT.md`, `theme.config.ts`, `design/`, and `BUILD_PROMPT.md` into the new `wolf-family-dentistry/` folder (alongside `src/`, `public/`, etc.).
2. Open `wolf-family-dentistry/` in Cursor.
3. Use the Claude Code extension and paste the contents of `BUILD_PROMPT.md` to continue with Phase 2.
