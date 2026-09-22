#!/usr/bin/env node
/**
 * visual-diff.mjs — the quality gate for the build loop.
 *
 * It renders the freshly-built Astro site and the frozen design mockup at the
 * same breakpoints, pixel-diffs them for gross layout breaks, then asks a vision
 * model to score fidelity against BLUEPRINT.md. It writes qa-report.json (which
 * the loop reads to decide whether to repair) and exits 0 on pass, 1 on fail.
 *
 * It is the SCORER, not the builder. The loop calls this; this never edits code.
 *
 * Usage:
 *   node visual-diff.mjs \
 *     --built http://localhost:4321 \      # the running built site (npm run preview)
 *     --design ./design/index.html \       # the frozen mockup (ground truth)
 *     --blueprint ./BLUEPRINT.md \         # design intent for the model judge
 *     --out ./.loop \                      # where screenshots + report are written
 *     --threshold 85                       # min model score (0-100) to pass
 *
 * Requires (install once in the project): playwright pixelmatch pngjs @anthropic-ai/sdk
 * Env: ANTHROPIC_API_KEY  (optional: ANTHROPIC_QA_MODEL, default claude-fable-5; ANTHROPIC_QA_EFFORT, default max)
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

// ----------------------------- config ---------------------------------------

const VIEWPORTS = [
  { label: "mobile", width: 375, height: 900 },
  { label: "tablet", width: 768, height: 1000 },
  { label: "desktop", width: 1280, height: 900 },
];

// Pixel diff is a coarse safety net, NOT the gate. A faithful Astro rebuild will
// never be pixel-identical to a Tailwind-CDN mockup (fonts, antialiasing, minor
// spacing), so a high mismatch is normal. We only treat an EXTREME mismatch as a
// hard "the layout exploded" signal. The model is the real judge.
const PIXEL_BLOWUP_RATIO = 0.55; // >55% different pixels at a breakpoint = broken

// ----------------------------- args ------------------------------------------

function parseArgs(argv) {
  const out = {
    built: "http://localhost:4321",
    design: "./design/index.html",
    blueprint: "./BLUEPRINT.md",
    out: "./.loop",
    threshold: 85,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--built") out.built = next();
    else if (a === "--design") out.design = next();
    else if (a === "--blueprint") out.blueprint = next();
    else if (a === "--out") out.out = next();
    else if (a === "--threshold") out.threshold = Number(next());
  }
  return out;
}

// ----------------------------- helpers ---------------------------------------

function fail(msg) {
  console.error(`[gate] ERROR: ${msg}`);
  process.exit(2); // 2 = gate could not run (distinct from 1 = ran and failed)
}

function extractJson(text) {
  // Tolerate models that wrap JSON in prose or fences.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in model reply");
  return JSON.parse(candidate.slice(start, end + 1));
}

async function loadDeps() {
  let chromium, pixelmatch, PNG, Anthropic;
  try {
    ({ chromium } = await import("playwright"));
    ({ default: pixelmatch } = await import("pixelmatch"));
    ({ PNG } = await import("pngjs"));
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
  } catch (err) {
    fail(
      "missing dependencies. In the project run:\n" +
        "  npm i -D playwright pixelmatch pngjs @anthropic-ai/sdk && npx playwright install chromium\n" +
        `(import failed: ${err.message})`,
    );
  }
  return { chromium, pixelmatch, PNG, Anthropic };
}

// ----------------------------- rendering --------------------------------------

async function shootUrl(browser, url, vp) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  // Let lazy fonts / images settle.
  await page.waitForTimeout(400);
  const buf = await page.screenshot({ fullPage: true, type: "png" });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  await page.close();
  return { buf, overflow };
}

async function shootHtml(browser, html, vp) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.setContent(html, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(400);
  const buf = await page.screenshot({ fullPage: true, type: "png" });
  await page.close();
  return { buf };
}

// ----------------------------- pixel diff -------------------------------------

function pixelDiff(PNG, pixelmatch, designBuf, builtBuf) {
  const a = PNG.sync.read(designBuf);
  const b = PNG.sync.read(builtBuf);
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);

  // Crop both to the shared top-left region so dimensions line up.
  const crop = (src) => {
    const out = new PNG({ width, height });
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const si = (src.width * y + x) << 2;
        const di = (width * y + x) << 2;
        out.data[di] = src.data[si];
        out.data[di + 1] = src.data[si + 1];
        out.data[di + 2] = src.data[si + 2];
        out.data[di + 3] = src.data[si + 3];
      }
    }
    return out;
  };

  const ca = crop(a);
  const cb = crop(b);
  const diff = new PNG({ width, height });
  const changed = pixelmatch(ca.data, cb.data, diff.data, width, height, {
    threshold: 0.12,
  });
  const ratio = changed / (width * height);
  const heightDelta = Math.abs(a.height - b.height) / Math.max(a.height, b.height);
  return { ratio, heightDelta, diffPng: PNG.sync.write(diff) };
}

// ----------------------------- model judge ------------------------------------

function judgePrompt(blueprint, vpLabel, pixelRatio, overflow) {
  return `You are a meticulous senior design QA reviewer comparing a freshly-built website against its approved design mockup.

You are given TWO screenshots at the ${vpLabel} breakpoint:
- IMAGE 1 = TARGET (the approved mockup, the ground truth)
- IMAGE 2 = BUILT (the current rebuilt site, what we are grading)

Grade IMAGE 2 on how faithfully it reproduces IMAGE 1, judged against the design intent below. A faithful rebuild will NOT be pixel-identical (fonts and antialiasing differ) — do NOT penalize tiny rendering differences. Penalize real divergence: wrong layout/structure, missing or reordered sections, wrong colors or type scale, broken spacing, missing components (e.g. a nav, a CTA), horizontal overflow, or content that doesn't match.

Signals from automated checks (context only):
- pixel mismatch at this breakpoint: ${(pixelRatio * 100).toFixed(1)}%
- horizontal overflow detected on built site: ${overflow ? "YES (treat as a real issue)" : "no"}

Design intent (BLUEPRINT.md):
"""
${blueprint.slice(0, 6000)}
"""

Return ONLY JSON, no prose, no fences:
{
  "pass": true,
  "score": 0,
  "issues": ["short, specific, each tied to a section or element"],
  "repairInstructions": "concrete instructions an AI coding agent can act on to make BUILT match TARGET; reference section names and what to change"
}
Set "pass" to true only if the built site is a faithful reproduction with no significant divergence.`;
}

async function judge(Anthropic, model, blueprint, vp, designBuf, builtBuf, pixelRatio, overflow) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model,
    max_tokens: 64000,
    output_config: { effort: process.env.ANTHROPIC_QA_EFFORT || "max" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: judgePrompt(blueprint, vp.label, pixelRatio, overflow) },
          { type: "text", text: "IMAGE 1 — TARGET (approved mockup):" },
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: designBuf.toString("base64") },
          },
          { type: "text", text: "IMAGE 2 — BUILT (current site):" },
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: builtBuf.toString("base64") },
          },
        ],
      },
    ],
  });
  if (msg.stop_reason === "refusal") {
    const explanation = msg.stop_details?.explanation;
    throw new Error(explanation ? "Claude refused visual QA: " + explanation : "Claude refused visual QA");
  }
  if (msg.stop_reason === "max_tokens" || msg.stop_reason === "model_context_window_exceeded") {
    throw new Error("Claude reached a token limit during visual QA");
  }
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const parsed = extractJson(text);
  return {
    pass: Boolean(parsed.pass),
    score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
    issues: Array.isArray(parsed.issues) ? parsed.issues.filter((x) => typeof x === "string") : [],
    repairInstructions: typeof parsed.repairInstructions === "string" ? parsed.repairInstructions : "",
  };
}

// ----------------------------- main -------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  const outDir = resolve(args.out);
  mkdirSync(outDir, { recursive: true });

  if (!process.env.ANTHROPIC_API_KEY) fail("ANTHROPIC_API_KEY is not set");
  const designPath = resolve(args.design);
  if (!existsSync(designPath)) fail(`design file not found: ${designPath}`);
  const blueprintPath = resolve(args.blueprint);
  const blueprint = existsSync(blueprintPath) ? readFileSync(blueprintPath, "utf8") : "(BLUEPRINT.md missing)";
  const designHtml = readFileSync(designPath, "utf8");
  const model = process.env.ANTHROPIC_QA_MODEL || "claude-fable-5";

  const { chromium, pixelmatch, PNG, Anthropic } = await loadDeps();

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const vp of VIEWPORTS) {
      const target = await shootHtml(browser, designHtml, vp);
      let built;
      try {
        built = await shootUrl(browser, args.built, vp);
      } catch (err) {
        fail(`could not load built site at ${args.built} (${vp.label}). Is the preview server running? ${err.message}`);
      }

      writeFileSync(join(outDir, `target-${vp.label}.png`), target.buf);
      writeFileSync(join(outDir, `built-${vp.label}.png`), built.buf);

      const { ratio, heightDelta, diffPng } = pixelDiff(PNG, pixelmatch, target.buf, built.buf);
      writeFileSync(join(outDir, `diff-${vp.label}.png`), diffPng);

      const verdict = await judge(
        Anthropic, model, blueprint, vp, target.buf, built.buf, ratio, built.overflow,
      );

      const blewUp = ratio > PIXEL_BLOWUP_RATIO;
      const pass = verdict.pass && verdict.score >= args.threshold && !blewUp && !built.overflow;

      const issues = [...verdict.issues];
      if (built.overflow) issues.unshift(`Horizontal overflow at ${vp.label}.`);
      if (blewUp) issues.unshift(`Layout differs drastically at ${vp.label} (${(ratio * 100).toFixed(0)}% pixels changed) — likely a structural break.`);

      results.push({
        viewport: vp.label,
        pass,
        score: verdict.score,
        pixelMismatch: Number((ratio * 100).toFixed(1)),
        heightDelta: Number((heightDelta * 100).toFixed(1)),
        overflow: built.overflow,
        issues,
        repairInstructions: verdict.repairInstructions,
      });

      console.log(
        `[gate] ${vp.label.padEnd(7)} score=${verdict.score} pixels=${(ratio * 100).toFixed(0)}% overflow=${built.overflow ? "Y" : "N"} -> ${pass ? "PASS" : "FAIL"}`,
      );
    }
  } finally {
    await browser.close();
  }

  const overallPass = results.every((r) => r.pass);
  const minScore = Math.min(...results.map((r) => r.score));

  // One consolidated repair instruction the loop can hand back to the builder.
  const repairForBuilder = results
    .filter((r) => !r.pass)
    .map((r) => `### ${r.viewport}\n${r.repairInstructions}\n- ${r.issues.join("\n- ")}`)
    .join("\n\n");

  const report = {
    pass: overallPass,
    minScore,
    threshold: args.threshold,
    builtUrl: args.built,
    designPath,
    generatedAt: new Date().toISOString(),
    viewports: results,
    repairForBuilder,
  };

  writeFileSync(join(outDir, "qa-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n[gate] overall ${overallPass ? "PASS" : "FAIL"} (min score ${minScore}/${args.threshold})`);
  console.log(`[gate] report + screenshots written to ${outDir}`);

  process.exit(overallPass ? 0 : 1);
}

main().catch((err) => fail(err.stack || err.message));
