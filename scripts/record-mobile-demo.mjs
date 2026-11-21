import { spawn, spawnSync } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_VIDEO_PATH = path.join(ROOT_DIR, 'docs', 'videos', 'demo-jornadas-mobile.webm');
const WSL_EMOJI_FONT_PATH = '/mnt/c/Windows/Fonts/seguiemj.ttf';
const DEFAULT_PORT = 5176;
const DEFAULT_URL = `http://127.0.0.1:${DEFAULT_PORT}`;
const MOBILE_VIEWPORT = { width: 390, height: 844 };

// Alvo de duração entre 4 e 5 minutos (~4m25s)
const TARGET_DURATION_MS = 265_000;
const MIN_DURATION_MS = 248_000;
const MAX_DURATION_MS = 285_000;

/**
 * Resolve Playwright dynamically from PLAYWRIGHT_MODULE_PATH, 'playwright', or 'playwright-core'
 * so the script works without modifying the project's package.json.
 */
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_PATH,
    'playwright',
    'playwright-core',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const mod = require(candidate);
      if (mod?.chromium) return mod;
    } catch {
      // Try next candidate
    }
  }

  throw new Error(
    'Playwright não encontrado. Instale `playwright` / `playwright-core` globalmente ou defina PLAYWRIGHT_MODULE_PATH.'
  );
}

function buildAppIfNeeded() {
  if (process.env.SKIP_BUILD === '1' && fsSync.existsSync(path.join(ROOT_DIR, 'dist', 'index.html'))) {
    console.log('📦 Reutilizando build existente em dist/ (SKIP_BUILD=1)...');
    return;
  }
  console.log('🔨 Gerando build de produção (vite build) para gravação limpa...');
  const res = spawnSync('npm', ['run', 'build'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    throw new Error(`Falha ao executar npm run build (código ${res.status}).`);
  }
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/login`);
      if (res.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error(`Servidor Vite preview não respondeu em ${url} dentro de ${timeoutMs}ms.`);
}

function startPreviewServer(port) {
  const logs = [];
  const child = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    }
  );

  child.stdout?.on('data', chunk => logs.push(chunk.toString()));
  child.stderr?.on('data', chunk => logs.push(chunk.toString()));

  return { child, logs };
}

function stopServer(child) {
  if (!child || child.killed) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      // Already exited
    }
  }
}

async function setupEmojiFont(context) {
  if (!fsSync.existsSync(WSL_EMOJI_FONT_PATH)) return;
  const fontBuffer = await fs.readFile(WSL_EMOJI_FONT_PATH);

  await context.route('**/__wsl_emoji.ttf', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'font/ttf',
      body: fontBuffer,
    });
  });

  await context.addInitScript(() => {
    const injectFontStyle = () => {
      if (document.getElementById('__wsl_emoji_style')) return;
      const style = document.createElement('style');
      style.id = '__wsl_emoji_style';
      style.textContent = `
        @font-face {
          font-family: "WSL Emoji";
          src: url("/__wsl_emoji.ttf") format("truetype");
        }
        body, input, button, select, textarea, h1, h2, h3, h4, p, span, div, td, th {
          font-family: "Inter", system-ui, -apple-system, "Segoe UI Emoji", "WSL Emoji", sans-serif;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    };

    if (document.head || document.documentElement) {
      injectFontStyle();
    } else {
      document.addEventListener('DOMContentLoaded', injectFontStyle, { once: true });
    }
  });
}

async function waitForSeed(page, baseUrl) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => localStorage.getItem('gymmanager-seeded') === 'true', {
    timeout: 15000,
  });
}

async function dismissToasts(page) {
  await page
    .evaluate(() => {
      document
        .querySelectorAll('button[aria-label="Fechar notificação"]')
        .forEach(btn => btn.click());
    })
    .catch(() => {});
}

async function settle(page, delayMs = 600) {
  await page
    .evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
    })
    .catch(() => {});
  if (delayMs > 0) {
    await page.waitForTimeout(delayMs);
  }
  await page
    .waitForFunction(
      () => {
        const skeletons = document.querySelectorAll('.animate-pulse');
        return Array.from(skeletons).every(
          el => !/\bh-(12|20|28|44|48|64)\b/.test(el.className)
        );
      },
      { timeout: 1000 }
    )
    .catch(() => {});
}

/**
 * Calibrate wait durations smoothly against TARGET_DURATION_MS (265s) so the demo
 * maintains an even, readable cadence across all 5 journeys and finishes within 4–5 min.
 */
function createPacer(recordingStartMs) {
  return async function waitPaced(page, baseMs, expectedProgress) {
    const elapsed = Date.now() - recordingStartMs;
    const remainingBudget = MAX_DURATION_MS - elapsed;
    if (remainingBudget <= 2000) {
      await page.waitForTimeout(Math.min(baseMs, 250));
      return;
    }

    const expectedElapsed = TARGET_DURATION_MS * expectedProgress;
    const windowMs = Math.max(8000, TARGET_DURATION_MS * 0.15);
    let factor = 1;
    if (elapsed < expectedElapsed) {
      factor = Math.min(1.45, 1 + (expectedElapsed - elapsed) / windowMs);
    } else {
      factor = Math.max(0.7, 1 - (elapsed - expectedElapsed) / windowMs);
    }
    const waitMs = Math.min(remainingBudget - 500, Math.max(120, Math.round(baseMs * factor)));
    await page.waitForTimeout(waitMs);
  };
}

/**
 * Display a temporary chapter overlay banner at the top of the mobile frame
 * so viewers can follow each persona transition cleanly in the demo video.
 */
async function showChapter(page, badge, title, subtitle, waitPaced, progress) {
  const displayMs = 3200;
  await page.evaluate(
    ({ badgeText, titleText, subtitleText, duration }) => {
      const existing = document.getElementById('__demo_chapter_banner');
      if (existing) existing.remove();

      const wrapper = document.createElement('div');
      wrapper.id = '__demo_chapter_banner';
      wrapper.style.cssText = `
        position: fixed;
        top: 14px;
        left: 14px;
        right: 14px;
        z-index: 99999;
        pointer-events: none;
        padding: 13px 15px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.94);
        border: 1px solid rgba(16, 185, 129, 0.55);
        box-shadow: 0 16px 36px rgba(2, 6, 23, 0.55);
        color: #f8fafc;
        backdrop-filter: blur(12px);
        transition: opacity 280ms ease, transform 280ms ease;
        opacity: 0;
        transform: translateY(-10px);
        font-family: "Inter", system-ui, -apple-system, "Segoe UI Emoji", "WSL Emoji", sans-serif;
      `;

      const badgeEl = document.createElement('div');
      badgeEl.textContent = badgeText;
      badgeEl.style.cssText = `
        display: inline-block;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #34d399;
        margin-bottom: 4px;
      `;

      const titleEl = document.createElement('div');
      titleEl.textContent = titleText;
      titleEl.style.cssText = 'font-size: 15px; font-weight: 800; line-height: 1.25;';

      const subEl = document.createElement('div');
      subEl.textContent = subtitleText;
      subEl.style.cssText = 'font-size: 11px; color: #cbd5e1; margin-top: 3px; line-height: 1.35;';

      wrapper.append(badgeEl, titleEl, subEl);
      document.body.appendChild(wrapper);

      requestAnimationFrame(() => {
        wrapper.style.opacity = '1';
        wrapper.style.transform = 'translateY(0)';
      });

      setTimeout(() => {
        wrapper.style.opacity = '0';
        wrapper.style.transform = 'translateY(-8px)';
        setTimeout(() => wrapper.remove(), 300);
      }, Math.max(400, duration - 300));
    },
    { badgeText: badge, titleText: title, subtitleText: subtitle, duration: displayMs }
  );
  await waitPaced(page, 2350, progress);
}

/**
 * Scroll target into view, show a brief emerald touch-ripple indicator at its center,
 * and click it so touch interactions feel natural and easy to follow in the video.
 */
async function tap(page, locator, pauseAfterMs = 1100) {
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  await locator
    .evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }))
    .catch(() => {});
  await page.waitForTimeout(140);

  const box = await locator.boundingBox();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.evaluate(
      ({ x, y }) => {
        const dot = document.createElement('div');
        dot.style.cssText = `
          position: fixed;
          left: ${x}px;
          top: ${y}px;
          width: 36px;
          height: 36px;
          margin-left: -18px;
          margin-top: -18px;
          border-radius: 9999px;
          border: 2.5px solid #10b981;
          background: rgba(16, 185, 129, 0.30);
          box-shadow: 0 0 18px rgba(16, 185, 129, 0.55);
          pointer-events: none;
          z-index: 99998;
          transform: scale(0.7);
          opacity: 1;
          transition: transform 320ms ease-out, opacity 320ms ease-out;
        `;
        document.body.appendChild(dot);
        requestAnimationFrame(() => {
          dot.style.transform = 'scale(1.5)';
          dot.style.opacity = '0';
        });
        setTimeout(() => dot.remove(), 350);
      },
      { x: cx, y: cy }
    );
    await page.waitForTimeout(240);
  }

  await locator.click();
  if (pauseAfterMs > 0) {
    await page.waitForTimeout(pauseAfterMs);
  }
}

/**
 * Progressive character-by-character typing so form filling feels natural on screen.
 */
async function typeText(page, locator, text, delayMs = 36) {
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  await locator
    .evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }))
    .catch(() => {});
  await page.waitForTimeout(120);
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(text, { delay: delayMs });
  await page.waitForTimeout(380);
}

async function smoothScrollContainer(page, selector, targetY, steps = 18) {
  const startY = await page.evaluate(sel => {
    if (!sel) return window.scrollY;
    const el = document.querySelector(sel);
    return el ? el.scrollTop : window.scrollY;
  }, selector);

  for (let i = 1; i <= steps; i += 1) {
    const progress = i / steps;
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const nextY = Math.round(startY + (targetY - startY) * eased);
    await page.evaluate(
      ({ sel, y }) => {
        if (!sel) {
          window.scrollTo(0, y);
          return;
        }
        const el = document.querySelector(sel);
        if (el) el.scrollTop = y;
        else window.scrollTo(0, y);
      },
      { sel: selector, y: nextY }
    );
    await page.waitForTimeout(45);
  }
}

async function smoothScrollLocator(locator, targetY, steps = 18) {
  const startY = await locator.evaluate(el => el.scrollTop);

  for (let i = 1; i <= steps; i += 1) {
    const progress = i / steps;
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const nextY = Math.round(startY + (targetY - startY) * eased);
    await locator.evaluate((el, y) => {
      el.scrollTop = y;
    }, nextY);
    await locator.page().waitForTimeout(45);
  }
}

async function closeModal(page, modalLocator, pauseAfterMs = 550) {
  const cancelBtn = modalLocator.getByRole('button', { name: 'Cancelar' });
  const closeBtn = modalLocator.locator('button[title="Fechar"]');
  if (await cancelBtn.count()) {
    await tap(page, cancelBtn.first(), 250);
  } else if (await closeBtn.count()) {
    await tap(page, closeBtn.first(), 250);
  } else {
    const iconCloseBtn = modalLocator.locator('button').first();
    if (await iconCloseBtn.count()) {
      await tap(page, iconCloseBtn, 250);
    } else {
      await page.keyboard.press('Escape');
    }
  }
  await modalLocator.waitFor({ state: 'hidden', timeout: 5000 });
  if (pauseAfterMs > 0) {
    await page.waitForTimeout(pauseAfterMs);
  }
}

async function navigateMobileNav(page, href, pauseAfterMs = 900) {
  await dismissToasts(page);
  await tap(page, page.locator(`nav.fixed a[href="${href}"]`), 220);
  await page.waitForURL(`**${href}`, { timeout: 10000 });
  await settle(page, pauseAfterMs);
}

async function loginAs(page, role) {
  await tap(page, page.locator(`#demo-fill-${role}`), 750);
  await tap(page, page.locator('#login-submit'), 350);
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await settle(page, 1200);
  await dismissToasts(page);
}

async function logoutMobile(page) {
  await dismissToasts(page);
  await tap(page, page.locator('#user-menu-btn'), 750);
  await tap(page, page.locator('#user-menu-logout'), 350);
  await page.waitForURL('**/login', { timeout: 10000 });
  await settle(page, 700);
}

async function main() {
  const { chromium } = loadPlaywright();
  const baseUrl = process.env.APP_URL || DEFAULT_URL;
  let serverInfo = null;

  if (!process.env.APP_URL) {
    buildAppIfNeeded();
    console.log(`🚀 Iniciando servidor Vite preview em ${baseUrl}...`);
    serverInfo = startPreviewServer(DEFAULT_PORT);
    try {
      await waitForServer(baseUrl);
    } catch (err) {
      stopServer(serverInfo.child);
      console.error(serverInfo.logs.join(''));
      throw err;
    }
  } else {
    console.log(`🌐 Usando servidor já em execução: ${baseUrl}`);
  }

  const tmpVideoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gymmanager-video-'));
  await fs.mkdir(path.dirname(OUTPUT_VIDEO_PATH), { recursive: true });

  const pageErrors = [];
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
    recordVideo: {
      dir: tmpVideoDir,
      size: MOBILE_VIEWPORT,
    },
  });

  let rawVideoPath = null;

  try {
    await setupEmojiFont(context);
    const page = await context.newPage();
    const recordingStartMs = Date.now();
    const waitPaced = createPacer(recordingStartMs);
    const logTime = label => {
      const secs = ((Date.now() - recordingStartMs) / 1000).toFixed(1);
      console.log(`⏱️  [${secs}s] ${label}`);
    };

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });
    const video = page.video();

    await waitForSeed(page, baseUrl);
    await settle(page, 900);

    // ============================================================
    // JORNADA 0: Autenticação, Validação de Perfil & Autocadastro (~0:00 -> ~0:42)
    // ============================================================
    logTime('Jornada 0 — Autenticação & Autocadastro');
    await showChapter(
      page,
      'Jornada 1/5 • Acesso Multi-Tenant',
      'Autenticação & Seleção de Perfil',
      'Validação cruzada por perfil, portal SuperAdmin e autocadastro',
      waitPaced,
      0.02
    );

    // Alternar entre perfis para mostrar a separação visual
    await tap(page, page.locator('#login-profile-personal'), 850);
    await tap(page, page.locator('#login-profile-admin'), 850);
    await tap(page, page.locator('#login-profile-aluno'), 700);

    // Validação cruzada de perfil (Admin tentando entrar no perfil Aluno)
    await typeText(page, page.locator('#login-email'), 'admin@gym.com', 38);
    await typeText(page, page.locator('#login-password'), 'admin123', 38);
    await tap(page, page.locator('#login-submit'), 1600);
    await dismissToasts(page);
    await tap(page, page.getByRole('button', { name: /Alternar para o perfil Academia/i }), 1100);

    // Portal SuperAdmin
    await tap(page, page.locator('#login-superadmin-toggle'), 1500);

    // Aba Criar Conta -> Sou Aluno -> Sou Personal
    await tap(page, page.getByRole('button', { name: 'Criar Conta', exact: true }), 900);
    await tap(page, page.getByRole('button', { name: /Sou Aluno/i }), 850);
    await tap(page, page.getByRole('button', { name: /Sou Personal/i }), 950);
    await smoothScrollContainer(page, null, 280, 18);
    await waitPaced(page, 1300, 0.14);
    await smoothScrollContainer(page, null, 0, 16);
    await tap(page, page.getByRole('button', { name: 'Entrar', exact: true }), 800);

    // ============================================================
    // JORNADA 1: SuperAdmin (~0:42 -> ~1:32)
    // ============================================================
    logTime('Jornada 1 — SuperAdmin (SaaS)');
    await showChapter(
      page,
      'Jornada 2/5 • Plataforma SaaS',
      'SuperAdmin',
      'Central SaaS, criação de academias (tenants) e backup AES-256',
      waitPaced,
      0.17
    );

    await loginAs(page, 'superadmin');
    await waitPaced(page, 1200, 0.21);
    await smoothScrollContainer(page, 'main', 380, 18);
    await waitPaced(page, 1400, 0.24);
    await smoothScrollContainer(page, 'main', 0, 16);

    await navigateMobileNav(page, '/academias', 1100);
    await tap(page, page.getByRole('button', { name: /Nova Academia \(Tenant\)/i }), 1100);

    const tenantModal = page.locator('[role="dialog"]');
    await tenantModal.waitFor({ state: 'visible' });
    await typeText(page, tenantModal.getByPlaceholder('Ex: Iron Force VIP'), 'Iron Force VIP', 34);
    await typeText(page, tenantModal.getByPlaceholder('00.000.000/0001-00'), '22.333.444/0001-55', 30);
    await typeText(page, tenantModal.getByPlaceholder('(11) 99999-9999'), '(11) 97777-8888', 30);
    await tenantModal.locator('input[type="number"]').first().fill('100');
    await smoothScrollLocator(tenantModal, 320, 18);
    await waitPaced(page, 600, 0.28);
    await typeText(page, tenantModal.getByPlaceholder('Nome completo do gestor'), 'Fernanda Gestora', 34);
    await typeText(page, tenantModal.getByPlaceholder('admin@academia.com'), 'fernanda@ironforce.com', 30);
    await typeText(page, tenantModal.getByPlaceholder('Mín. 6 caracteres'), 'iron1234', 34);
    await tap(page, tenantModal.getByRole('button', { name: /Criar Academia & Admin/i }), 1100);
    await tenantModal.waitFor({ state: 'hidden', timeout: 5000 });
    await dismissToasts(page);

    await smoothScrollContainer(page, 'main', 460, 18);
    await waitPaced(page, 1600, 0.32);
    await smoothScrollContainer(page, 'main', 0, 16);

    // Backup & Segurança (exclusivo SuperAdmin)
    await tap(page, page.locator('#user-menu-btn'), 800);
    await tap(page, page.getByRole('button', { name: /Backup & Gestão de Dados/i }), 1600);
    const backupModal = page.locator('[role="dialog"]').last();
    await smoothScrollLocator(backupModal, 240, 16);
    await waitPaced(page, 1300, 0.35);
    await closeModal(page, backupModal, 500);
    await logoutMobile(page);

    // ============================================================
    // JORNADA 2: Admin da Academia (~1:32 -> ~2:28)
    // ============================================================
    logTime('Jornada 2 — Admin da Academia');
    await showChapter(
      page,
      'Jornada 3/5 • Gestão da Academia',
      'Admin (Tenant)',
      'Assentos, equipe de personais, alunos, identidade visual e modo escuro',
      waitPaced,
      0.37
    );

    await loginAs(page, 'admin');
    await waitPaced(page, 1200, 0.40);
    await smoothScrollContainer(page, 'main', 360, 18);
    await waitPaced(page, 1300, 0.42);
    await smoothScrollContainer(page, 'main', 0, 16);

    // Equipe (Personais)
    await navigateMobileNav(page, '/personais', 1000);
    await tap(page, page.getByRole('button', { name: /Novo Personal/i }), 1000);
    const personalModal = page.locator('[role="dialog"]').last();
    await personalModal.waitFor({ state: 'visible' });
    await typeText(page, personalModal.getByPlaceholder('Ex: Prof. Marcos Silva'), 'Prof. Camila Rocha', 34);
    await typeText(page, personalModal.getByPlaceholder('personal@academia.com'), 'camila@gym.com', 34);
    await typeText(page, personalModal.getByPlaceholder('000000-G/SP'), '098765-G/SP', 34);
    await waitPaced(page, 900, 0.46);
    await closeModal(page, personalModal, 500);

    // Alunos: filtros + Detalhes de Ana Silva
    await navigateMobileNav(page, '/alunos', 1000);
    await tap(page, page.getByRole('button', { name: 'Ativos', exact: true }), 800);
    await tap(page, page.getByRole('button', { name: 'Inativos', exact: true }), 800);
    await tap(page, page.getByRole('button', { name: 'Todos', exact: true }), 750);
    await tap(page, page.getByText('Ana Silva').first(), 1600);
    await closeModal(page, page.locator('[role="dialog"]').last(), 500);

    // Treinos
    await navigateMobileNav(page, '/treinos', 1000);
    await smoothScrollContainer(page, 'main', 260, 16);
    await waitPaced(page, 900, 0.51);

    // Configurações (Identidade Visual) + Modo Escuro no Dashboard
    await navigateMobileNav(page, '/configuracoes', 1000);
    await smoothScrollContainer(page, 'main', 460, 18);
    await tap(page, page.getByRole('button', { name: /Índigo Moderno/i }), 1000);
    await tap(page, page.getByRole('button', { name: /Azul Oceano/i }), 950);
    await tap(page, page.getByRole('button', { name: /Verde Esmeralda/i }), 850);
    await smoothScrollContainer(page, 'main', 0, 16);
    await tap(page, page.locator('button[title="Modo escuro"]'), 1300);
    await navigateMobileNav(page, '/dashboard', 1400);
    await tap(page, page.locator('button[title="Modo claro"]'), 700);
    await logoutMobile(page);

    // ============================================================
    // JORNADA 3: Personal Trainer (~2:28 -> ~3:25)
    // ============================================================
    logTime('Jornada 3 — Personal Trainer');
    await showChapter(
      page,
      'Jornada 4/5 • Equipe Técnica',
      'Personal Trainer',
      'Montagem e prescrição de treinos, aparelhos, catálogo e evolução',
      waitPaced,
      0.57
    );

    await loginAs(page, 'personal');
    await waitPaced(page, 1000, 0.60);

    // Treinos: Novo Treino + Prescrever
    await navigateMobileNav(page, '/treinos', 1000);
    await tap(page, page.getByRole('button', { name: /Novo Treino/i }), 1000);
    const workoutModal = page.locator('[role="dialog"]').last();
    await workoutModal.waitFor({ state: 'visible' });
    await typeText(page, workoutModal.getByPlaceholder('Ex: Treino A - Superior'), 'Treino C - Costas', 34);
    await workoutModal.locator('select').selectOption({ index: 2 });
    await typeText(page, workoutModal.getByPlaceholder('Ex: Peito / Tríceps'), 'Costas / Bíceps', 34);
    await tap(page, workoutModal.getByRole('button', { name: /\+ Adicionar exercício/i }), 600);
    await typeText(
      page,
      workoutModal.getByPlaceholder('Buscar exercício por nome ou músculo...'),
      'Remada',
      45
    );
    await tap(page, workoutModal.locator('.max-h-40 button').first(), 1100);
    await closeModal(page, workoutModal, 500);

    await tap(page, page.getByRole('button', { name: 'Prescrever' }).first(), 950);
    const prescribeModal = page.locator('[role="dialog"]').last();
    await prescribeModal.waitFor({ state: 'visible' });
    await tap(page, prescribeModal.getByText('Pedro Santos').first(), 650);
    await tap(page, prescribeModal.getByText('Mariana Costa').first(), 1100);
    await closeModal(page, prescribeModal, 500);

    // Aparelhos: lista + modal Novo Aparelho
    await navigateMobileNav(page, '/aparelhos', 1000);
    await smoothScrollContainer(page, 'main', 320, 16);
    await waitPaced(page, 800, 0.67);
    await smoothScrollContainer(page, 'main', 0, 14);
    await tap(page, page.getByRole('button', { name: /Novo Aparelho/i }), 900);
    const equipModal = page.locator('[role="dialog"]').last();
    await typeText(
      page,
      equipModal.getByPlaceholder('Ex: Leg Press 45°, Cadeira Extensora, Smith Machine'),
      'Remada Cavalinho Articulada',
      32
    );
    await typeText(page, equipModal.getByPlaceholder('Ex: Movement, Matrix'), 'Technogym', 36);
    await closeModal(page, equipModal, 450);

    // Exercícios via Ações Rápidas no Dashboard
    await navigateMobileNav(page, '/dashboard', 700);
    await tap(page, page.getByRole('button', { name: 'Exercícios', exact: true }), 450);
    await page.waitForURL('**/exercicios', { timeout: 10000 });
    await settle(page, 1000);
    await tap(page, page.getByRole('button', { name: /Filtros/i }), 950);
    await tap(page, page.getByRole('button', { name: 'Peito', exact: true }), 900);
    await tap(page, page.getByRole('button', { name: 'Costas', exact: true }), 900);
    await tap(page, page.getByRole('button', { name: 'Todos', exact: true }).first(), 700);
    await tap(page, page.getByRole('button', { name: /Novo Exercício Personalizado/i }), 1100);
    await closeModal(page, page.locator('[role="dialog"]').last(), 450);

    // Evolução via Ações Rápidas no Dashboard (alternando alunos no gráfico Chart.js)
    await navigateMobileNav(page, '/dashboard', 700);
    await tap(page, page.getByRole('button', { name: 'Evolução', exact: true }), 450);
    await page.waitForURL('**/evolucao', { timeout: 10000 });
    await page.locator('canvas').waitFor({ state: 'visible' });
    await settle(page, 1400);
    await page.locator('main select').selectOption({ index: 1 });
    await waitPaced(page, 1500, 0.74);
    await smoothScrollContainer(page, 'main', 380, 18);
    await waitPaced(page, 1200, 0.76);

    // Histórico & Auditoria
    await navigateMobileNav(page, '/historico', 1000);
    await tap(page, page.getByRole('button', { name: /Log de Atividades/i }), 1200);
    await smoothScrollContainer(page, 'main', 260, 16);
    await waitPaced(page, 900, 0.78);
    await logoutMobile(page);

    // ============================================================
    // JORNADA 4: Aluno Mobile PWA (~3:25 -> ~4:25)
    // ============================================================
    logTime('Jornada 4 — Aluno Mobile PWA');
    await showChapter(
      page,
      'Jornada 5/5 • Experiência do Aluno',
      'Aluno PWA Mobile',
      'Meus treinos, execução ao vivo, descanso, Story e evolução',
      waitPaced,
      0.80
    );

    await loginAs(page, 'aluno');
    await waitPaced(page, 1100, 0.82);

    // Meus Treinos -> Comunidade -> Meus Treinos -> Ver Ficha -> Iniciar Treino
    await navigateMobileNav(page, '/meus-treinos', 1000);
    await tap(page, page.getByRole('button', { name: /^Comunidade/i }), 1100);
    await tap(page, page.getByRole('button', { name: /^Meus Treinos/i }), 900);
    await tap(page, page.getByRole('button', { name: 'Ver Ficha' }).first(), 1300);
    const detailModal = page.locator('[role="dialog"]');
    await smoothScrollLocator(detailModal, 220, 16);
    await waitPaced(page, 800, 0.85);
    await tap(page, detailModal.getByRole('button', { name: /Iniciar Treino/i }), 500);
    await page.waitForURL('**/treino-ativo/**', { timeout: 10000 });
    await page.getByText('Progresso Geral:').waitFor({ state: 'visible' });
    await settle(page, 1100);

    // Executar 3 séries com interação real no RestTimerOverlay e modal Ver GIF
    await tap(page, page.locator('button[title="Concluir série"]').first(), 2200);
    await page.getByText('Tempo de Descanso').waitFor({ state: 'visible' });
    await tap(page, page.locator('button:has-text("15s")').nth(1), 1100);
    await tap(page, page.locator('button:has-text("15s")').nth(0), 1000);
    await tap(page, page.getByRole('button', { name: 'Pular' }), 700);

    await tap(page, page.locator('button[title="Concluir série"]').first(), 1300);
    await tap(page, page.getByRole('button', { name: 'Pular' }), 650);
    await tap(page, page.locator('button[title="Concluir série"]').first(), 1200);
    await tap(page, page.getByRole('button', { name: 'Pular' }), 650);

    await tap(page, page.locator('button[title="Ver execução em GIF"]').first(), 1600);
    await closeModal(page, page.locator('[role="dialog"]').last(), 500);

    // Finalizar -> Gerar Post Instagram (alternando temas) -> Confirmar & Salvar
    await tap(page, page.locator('button[title="Finalizar e registrar treino"]'), 1100);
    const finishModal = page.locator('[role="dialog"]').last();
    await typeText(
      page,
      finishModal.getByPlaceholder('Como foi o treino? Registre suas cargas ou observações...'),
      'Treino concluído no mobile!',
      36
    );
    await tap(page, finishModal.getByRole('button', { name: /Gerar Post \/ Compartilhar no Instagram/i }), 1500);

    const shareModal = page.locator('[role="dialog"]').last();
    await shareModal.getByText('Gerar Post para Instagram').waitFor({ state: 'visible' });
    await smoothScrollLocator(shareModal, 260, 16);
    await tap(page, shareModal.getByRole('button', { name: /Gold Champion/i }), 1100);
    await tap(page, shareModal.getByRole('button', { name: /Cyber Violet/i }), 1100);
    await tap(page, shareModal.getByRole('button', { name: /Neon Emerald/i }), 950);
    await smoothScrollLocator(shareModal, 440, 16);
    await waitPaced(page, 900, 0.92);
    await tap(page, shareModal.getByRole('button', { name: 'Voltar' }), 700);

    await tap(page, finishModal.getByRole('button', { name: /Confirmar & Salvar/i }), 600);
    await page.waitForURL('**/meus-treinos', { timeout: 10000 });
    await settle(page, 850);
    await dismissToasts(page);

    // Histórico do Aluno com a sessão registrada
    await navigateMobileNav(page, '/historico', 1500);

    // Minha Evolução (Chart.js)
    await navigateMobileNav(page, '/evolucao', 950);
    await page.locator('canvas').waitFor({ state: 'visible' });
    await settle(page, 1300);
    await smoothScrollContainer(page, 'main', 280, 16);
    await waitPaced(page, 1100, 0.96);

    // Meu Perfil & Avatar
    await dismissToasts(page);
    await tap(page, page.locator('#user-menu-btn'), 750);
    await tap(page, page.getByRole('button', { name: /Meu Perfil & Avatar/i }), 1000);
    const profileModal = page.locator('[role="dialog"]').last();
    await tap(page, profileModal.getByRole('button', { name: /Escolher Avatar Gym/i }), 1100);
    await tap(page, profileModal.getByRole('button', { name: /Campeão de Ouro/i }), 950);
    await tap(page, profileModal.getByRole('button', { name: /Atleta Fitness/i }), 950);
    await tap(page, profileModal.getByRole('button', { name: /Confirmar Avatar & Voltar/i }), 850);
    await smoothScrollLocator(profileModal, 460, 16);
    await tap(page, profileModal.getByRole('button', { name: /Salvar Perfil/i }), 1200);
    await dismissToasts(page);

    // Garantir que a duração final fique estritamente entre 4 e 5 minutos (248s-285s)
    const elapsedAfterAll = Date.now() - recordingStartMs;
    if (elapsedAfterAll < MIN_DURATION_MS) {
      logTime(`Ajustando encerramento suave no Dashboard (+${Math.round((MIN_DURATION_MS - elapsedAfterAll) / 1000)}s)`);
      await navigateMobileNav(page, '/dashboard', 1400);
      await smoothScrollContainer(page, 'main', 340, 20);
      const stillLeft = Math.max(0, 255_000 - (Date.now() - recordingStartMs));
      if (stillLeft > 0) {
        await page.waitForTimeout(Math.min(stillLeft, 15_000));
      }
      await smoothScrollContainer(page, 'main', 0, 18);
      const finalLeft = Math.max(0, 258_000 - (Date.now() - recordingStartMs));
      if (finalLeft > 0) {
        await page.waitForTimeout(Math.min(finalLeft, 15_000));
      }
    } else {
      await page.waitForTimeout(1000);
    }

    logTime('Finalizando gravação do vídeo');
    if (video) {
      rawVideoPath = await video.path();
    }
  } finally {
    await context.close();
    await browser.close();
    if (serverInfo) {
      stopServer(serverInfo.child);
      console.log('🛑 Servidor Vite preview encerrado.');
    }
  }

  if (!rawVideoPath || !fsSync.existsSync(rawVideoPath)) {
    throw new Error('Playwright não gerou o arquivo de vídeo esperado.');
  }

  await fs.copyFile(rawVideoPath, OUTPUT_VIDEO_PATH);
  await fs.rm(tmpVideoDir, { recursive: true, force: true });

  const stat = await fs.stat(OUTPUT_VIDEO_PATH);
  console.log(`\n✅ Vídeo mobile salvo em ${path.relative(ROOT_DIR, OUTPUT_VIDEO_PATH)} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);

  if (pageErrors.length > 0) {
    console.error('\n❌ Erros de runtime detectados durante a gravação:');
    for (const err of pageErrors) {
      console.error('  -', err);
    }
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Erro fatal ao gravar vídeo mobile:', err);
  process.exit(1);
});
