#!/usr/bin/env node
/**
 * Сборка борта без человека и без сервера.
 *
 *   node tools/ship-cli.mjs --text "имперский дредноут без парусов" --out ship.png
 *
 * Печатает JSON с подписью, числом мешей и стволов — это и есть контракт для
 * агента: один вызов, один кадр, одна спека.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { buildSync } from 'esbuild';

const require = createRequire(import.meta.url);
const ROOT = resolve(import.meta.dirname, '..');
const ENTRY = join(ROOT, 'tools', 'viewer.ts');

/** Манифест CC0-текстур: страница грузится с file://, поэтому отдаём путь, не URL сервера. */
function packManifest() {
  const path = join(ROOT, 'public', 'textures', 'pack.json');
  return existsSync(path) ? `file://${path.replace(/\\/g, '/')}` : undefined;
}

function parseArgs(argv) {
  const out = { view: 'three-quarter', size: '1280x800', background: '#0b1224' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i++;
  }
  return out;
}

function loadPlaywright() {
  const candidates = [
    'playwright-core',
    'playwright',
    'C:/Users/bistr/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core',
    join(execSafe('npm root -g') || '', 'playwright-core'),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return require(candidate);
    } catch {
      /* следующий кандидат */
    }
  }
  return null;
}

function execSafe(command) {
  try {
    return execFileSync('cmd', ['/c', command], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Users/bistr/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',
  ];
  return candidates.find((path) => path && existsSync(path));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.out) {
    console.error('usage: node tools/ship-cli.mjs --text "<описание>" [--seed 12] [--view side] [--out ship.png] [--spec ship.json]');
    process.exit(2);
  }

  const [width, height] = args.size.split('x').map(Number);
  const job = {
    text: args.text,
    faction: args.faction,
    classId: args.class,
    seed: args.seed ? Number(args.seed) : undefined,
    view: args.view,
    width: width || 1280,
    height: height || 800,
    background: args.background === 'none' ? null : args.background,
    glb: Boolean(args.glb),
    texSize: args.tex ? Number(args.tex) : 1024,
    packManifest: packManifest(),
  };

  const bundle = buildSync({
    entryPoints: [ENTRY],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    write: false,
    minify: true,
    logLevel: 'silent',
  }).outputFiles[0].text;

  const dir = mkdtempSync(join(tmpdir(), 'ship-cli-'));
  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:${job.background ?? 'transparent'}}</style>
<body><script id="job" type="application/json">${JSON.stringify(job).replace(/</g, '\\u003c')}</script>
<script>window.__SHIP_JOB__=JSON.parse(document.getElementById('job').textContent);</script>
<script>${bundle}</script></body>`;
  const htmlPath = join(dir, 'ship.html');
  writeFileSync(htmlPath, html, 'utf8');

  const playwright = loadPlaywright();
  if (!playwright) {
    console.error('нужен playwright-core: npm i -D playwright && npx playwright install chromium');
    process.exit(3);
  }
  const executablePath = chromePath();
  const browser = await playwright.chromium.launch({
    executablePath,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--allow-file-access-from-files',
    ],
  });
  try {
    const page = await browser.newPage({ viewport: { width: job.width, height: job.height } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`);
    try {
      await page.waitForFunction(() => Boolean(window.__SHIP_RESULT__), null, { timeout: 60000 });
    } catch (error) {
      console.error('кадр не собрался. ошибки страницы:', JSON.stringify(errors, null, 1));
      throw error;
    }

    const outPath = resolve(args.out);
    mkdirSync(dirname(outPath), { recursive: true });
    await page.screenshot({
      path: outPath,
      omitBackground: job.background === null,
      clip: { x: 0, y: 0, width: job.width, height: job.height },
    });

    const result = await page.evaluate(() => window.__SHIP_RESULT__);
    let glbBytes = 0;
    if (args.glb && result?.glb) {
      const buffer = Buffer.from(result.glb, 'base64');
      const glbPath = resolve(args.glb === true ? args.out.replace(/\.png$/, '') + '.glb' : args.glb);
      mkdirSync(dirname(glbPath), { recursive: true });
      writeFileSync(glbPath, buffer);
      glbBytes = buffer.length;
      result.glbPath = glbPath;
    }
    delete result.glb;
    const report = { ok: errors.length === 0, out: outPath, glbBytes, job, errors, ...result };
    if (args.spec) writeFileSync(resolve(args.spec), JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report, null, 1));
    if (errors.length > 0) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(String(error?.stack || error));
  process.exit(1);
});
