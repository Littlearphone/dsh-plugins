// Drive the running GUI with Playwright's own Chromium and report what actually
// rendered. This is the check that catches "the bundle loaded but the tab is
// blank" — something node --check and stub rendering cannot see.
//
//   node scripts/ui-probe.mjs --url "http://127.0.0.1:<port>/?token=<token>"
//
// The token is a credential: pass it on the command line, never commit it.
// Edge is deliberately not used (see AGENTS.md), and the browser is always
// closed in `finally`.
import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Playwright's bundled build may not match this package version (a download
 * would be required). Reuse whichever Chromium is already installed instead;
 * an explicit PLAYWRIGHT_CHROMIUM wins, and the bundled default is the last
 * resort.
 */
function findInstalledChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM !== undefined) return process.env.PLAYWRIGHT_CHROMIUM;
  const root = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  if (root === '' || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((name) => name.startsWith('chromium-'))
    .sort()
    .reverse();
  for (const name of candidates) {
    for (const rel of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
      const candidate = join(root, name, rel);
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const url = arg('url');
if (url === undefined) {
  console.error('usage: node scripts/ui-probe.mjs --url "<tokenized url>" [--session <title>] [--shot <png>] [--executable <chromium>]');
  process.exit(2);
}
const sessionTitle = arg('session', '任务列表与会话关联设计');
const shot = arg('shot', 'probe.png');
// Optional: a Playwright-downloaded Chromium that differs from the revision the
// installed Playwright expects (offline machines cannot fetch the matching one).
// Falls back to whichever build is already installed.
const executablePath = arg('executable') ?? findInstalledChromium();

const report = [];
let failures = 0;
const check = (label, ok, detail) => {
  report.push(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : `: ${detail}`}`);
  if (!ok) failures += 1;
};

const browser = await chromium.launch({
  headless: true,
  ...(executablePath === undefined ? {} : { executablePath }),
});
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  // Open the session the plugins hang off.
  const session = page.locator(`text="${sessionTitle}"`).first();
  await session.waitFor({ state: 'visible', timeout: 20000 }).catch(() => undefined);
  if (await session.count()) {
    await session.click();
    await page.waitForTimeout(9000);
  }
  check('session opened', (await page.locator('button[title="任务列表"], button[aria-label="任务列表"]').count()) > 0);

  // The board.
  const boardEntry = page.locator('button[title="任务列表"], button[aria-label="任务列表"]').first();
  await boardEntry.click().catch(() => undefined);
  await page.waitForTimeout(6000);
  const cards = await page.locator('[data-task-card]').count();
  check('board cards', cards >= 15, String(cards));

  // The services dropdown.
  const servicesEntry = page.locator('button[title="服务管理"], button[aria-label="服务管理"]').first();
  await servicesEntry.click().catch(() => undefined);
  await page.waitForTimeout(5000);
  const menuText = await page
    .locator('[class*=dsh-svc]')
    .allInnerTexts()
    .then((texts) => texts.join(' | ').replace(/\s+/g, ' ').trim());
  check('services dropdown lists a script', /check/.test(menuText), menuText.slice(0, 120) || 'empty');

  // The panel behind 在侧栏打开.
  const openButton = page.locator('button', { hasText: '在侧栏打开' }).first();
  const hasOpen = (await openButton.count()) > 0;
  if (hasOpen) {
    await openButton.click();
    await page.waitForTimeout(5000);
  }
  const panelText = await page
    .locator('[class*=dsh-svc-panel], [class*=dsh-svc-list]')
    .allInnerTexts()
    .then((texts) => texts.join(' | ').replace(/\s+/g, ' ').trim());
  check('panel opened', hasOpen && /check/.test(panelText), panelText.slice(0, 120) || 'empty');

  await page.screenshot({ path: shot });
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' ; '));
  report.push(`screenshot: ${shot}`);
} finally {
  // Always: no browser may outlive the probe.
  await browser.close();
}
console.log(report.join('\n'));
process.exit(failures === 0 ? 0 : 1);
