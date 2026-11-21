import { spawn, spawnSync } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'docs', 'screenshots');
const WSL_EMOJI_FONT_PATH = '/mnt/c/Windows/Fonts/seguiemj.ttf';
const DEFAULT_PORT = 5175;
const DEFAULT_URL = `http://127.0.0.1:${DEFAULT_PORT}`;

/**
 * Resolve Playwright dynamically from PLAYWRIGHT_MODULE_PATH, 'playwright', or 'playwright-core'
 * so the script works without adding Playwright to the project's package.json.
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
  console.log('🔨 Gerando build de produção (vite build) para evitar double-seed do StrictMode...');
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
    // Kill the detached process group so Vite/esbuild children do not linger
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      // Already exited
    }
  }
}

/**
 * In headless Linux/WSL environments without a color emoji font installed,
 * serve Windows Segoe UI Emoji from /mnt/c/Windows/Fonts/seguiemj.ttf (if present)
 * via Playwright route interception so emojis render instead of tofu boxes.
 */
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
  for (let pass = 0; pass < 3; pass += 1) {
    const closeBtns = page.locator('button[aria-label="Fechar notificação"]');
    const count = await closeBtns.count();
    if (count === 0) break;
    for (let i = 0; i < count; i += 1) {
      await closeBtns
        .nth(0)
        .click({ timeout: 500 })
        .catch(() => {});
    }
    await page.waitForTimeout(150);
  }
}

async function settle(page, delayMs = 850) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });
  await page.waitForTimeout(delayMs);
  await page
    .waitForFunction(
      () => {
        const skeletons = document.querySelectorAll('.animate-pulse');
        return Array.from(skeletons).every(
          el => !/\bh-(12|20|28|44|48|64)\b/.test(el.className)
        );
      },
      { timeout: 2500 }
    )
    .catch(() => {});
}

async function capture(page, relPath, options = {}) {
  const fullPath = path.join(SCREENSHOTS_DIR, relPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await page.screenshot({
    path: fullPath,
    fullPage: Boolean(options.fullPage),
    animations: 'allow',
  });
  console.log(`  📸 ${relPath}`);
}

/**
 * MainLayout locks outer height to h-screen and scrolls inside <main>.
 * Temporarily expand viewport height so full scrollable content is captured cleanly.
 */
async function captureExpandedMain(page, relPath) {
  const original = page.viewportSize() || { width: 1440, height: 900 };
  const targetHeight = await page.evaluate(() => {
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const headerH = header ? header.getBoundingClientRect().height : 64;
    const mainScroll = main ? main.scrollHeight : document.documentElement.scrollHeight;
    return Math.min(2600, Math.max(900, Math.ceil(mainScroll + headerH + 24)));
  });

  await page.setViewportSize({ width: original.width, height: targetHeight });
  await settle(page, 400);
  await capture(page, relPath);
  await page.setViewportSize(original);
  await page.waitForTimeout(200);
}

async function loginAs(page, role) {
  await page.locator(`#demo-fill-${role}`).click();
  await page.locator('#login-submit').click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await settle(page, 900);
  await dismissToasts(page);
}

async function navigateSidebar(page, href) {
  await dismissToasts(page);
  await page.locator(`aside nav a[href="${href}"]`).click();
  await page.waitForURL(`**${href}`, { timeout: 10000 });
  await settle(page, 850);
}

async function newDesktopContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'pt-BR',
  });
  await setupEmojiFont(context);
  return context;
}

async function newMobileContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
  });
  await setupEmojiFont(context);
  return context;
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

  await fs.rm(SCREENSHOTS_DIR, { recursive: true, force: true });
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  const pageErrors = [];
  const browser = await chromium.launch({ headless: true });

  const attachErrorListener = (page, label) => {
    page.on('pageerror', err => {
      pageErrors.push(`[${label}] ${err.message}`);
    });
  };

  try {
    // ============================================================
    // JORNADA 0: Autenticação, Seleção de Perfil & Autocadastro
    // ============================================================
    console.log('\n🔹 Capturando Jornada 0 — Autenticação & Cadastro...');
    {
      const context = await newDesktopContext(browser);
      const page = await context.newPage();
      attachErrorListener(page, 'auth');

      await waitForSeed(page, baseUrl);
      await settle(page, 700);
      await capture(page, '00-auth/01-login-perfis.png');

      // Erro didático ao tentar entrar com e-mail Admin no perfil Aluno
      await page.locator('#login-profile-aluno').click();
      await page.locator('#login-email').fill('admin@gym.com');
      await page.locator('#login-password').fill('admin123');
      await page.locator('#login-submit').click();
      await page.getByText('Alternar para o perfil Academia (Admin)').waitFor({ state: 'visible' });
      await settle(page, 450);
      await dismissToasts(page);
      await capture(page, '00-auth/02-login-erro-perfil.png');

      // Portal SuperAdmin
      await page.locator('#login-superadmin-toggle').click();
      await page.getByText('Portal SuperAdmin').waitFor({ state: 'visible' });
      await settle(page, 450);
      await capture(page, '00-auth/03-login-superadmin.png');

      // Aba Criar Conta (Personal)
      await page.getByRole('button', { name: 'Criar Conta', exact: true }).click();
      await page.getByRole('button', { name: /Sou Personal/i }).click();
      await page.locator('#register-name').waitFor({ state: 'visible' });
      await settle(page, 500);
      await capture(page, '00-auth/04-cadastro-conta.png', { fullPage: true });

      await context.close();
    }

    // ============================================================
    // JORNADA 1: SuperAdmin (Plataforma SaaS)
    // ============================================================
    console.log('\n🔹 Capturando Jornada 1 — SuperAdmin...');
    {
      const context = await newDesktopContext(browser);
      const page = await context.newPage();
      attachErrorListener(page, 'superadmin');

      await waitForSeed(page, baseUrl);
      await loginAs(page, 'superadmin');
      await capture(page, '01-superadmin/01-dashboard-saas.png');

      await navigateSidebar(page, '/academias');
      await capture(page, '01-superadmin/02-academias-lista.png');

      // Abrir modal de Nova Academia (Tenant) e preencher dados de demonstração
      await page.getByRole('button', { name: /Nova Academia \(Tenant\)/i }).click();
      const tenantModal = page.locator('[role="dialog"]');
      await tenantModal.waitFor({ state: 'visible' });
      await tenantModal.getByPlaceholder('Ex: Iron Force VIP').fill('Iron Force VIP');
      await tenantModal.getByPlaceholder('00.000.000/0001-00').fill('22.333.444/0001-55');
      await tenantModal.getByPlaceholder('(11) 99999-9999').fill('(11) 97777-8888');
      await tenantModal.locator('input[type="number"]').first().fill('100');
      await tenantModal.getByPlaceholder('Nome completo do gestor').fill('Fernanda Gestora');
      await tenantModal.getByPlaceholder('admin@academia.com').fill('fernanda@ironforce.com');
      await tenantModal.getByPlaceholder('Mín. 6 caracteres').fill('iron1234');
      await settle(page, 450);
      await capture(page, '01-superadmin/03-academias-modal-nova.png');

      // Submeter e capturar listagem atualizada com 2 academias
      await tenantModal.getByRole('button', { name: /Criar Academia & Admin/i }).click();
      await page.getByText('Iron Force VIP').first().waitFor({ state: 'visible' });
      await settle(page, 600);
      await dismissToasts(page);
      await capture(page, '01-superadmin/04-academias-criada.png');

      // Backup & Gestão de Dados (AES-256)
      await page.locator('#user-menu-btn').click();
      await page.getByRole('button', { name: /Backup & Gestão de Dados/i }).click();
      await page.getByText('Backup & Segurança de Dados').waitFor({ state: 'visible' });
      await settle(page, 450);
      await capture(page, '01-superadmin/05-backup-dados.png');

      await context.close();
    }

    // ============================================================
    // JORNADA 2: Admin / Gestor da Academia
    // ============================================================
    console.log('\n🔹 Capturando Jornada 2 — Admin da Academia...');
    {
      const context = await newDesktopContext(browser);
      const page = await context.newPage();
      attachErrorListener(page, 'admin');

      await waitForSeed(page, baseUrl);
      await loginAs(page, 'admin');
      await capture(page, '02-admin/01-dashboard-admin.png');

      // Equipe (Personais)
      await navigateSidebar(page, '/personais');
      await capture(page, '02-admin/02-equipe-personais.png');

      // Modal Novo Personal preenchido (sem salvar)
      await page.getByRole('button', { name: /Novo Personal/i }).click();
      const personalModal = page.locator('[role="dialog"]');
      await personalModal.waitFor({ state: 'visible' });
      await personalModal.getByPlaceholder('Ex: Prof. Marcos Silva').fill('Prof. Camila Rocha');
      await personalModal.getByPlaceholder('personal@academia.com').fill('camila@gym.com');
      await personalModal.getByPlaceholder('(11) 99999-9999').fill('(11) 98765-4433');
      await personalModal.getByPlaceholder('000000-G/SP').fill('098765-G/SP');
      await personalModal.getByPlaceholder('Mínimo 6 caracteres').fill('personal123');
      await settle(page, 450);
      await capture(page, '02-admin/03-personais-modal-novo.png');
      await page.keyboard.press('Escape');
      await personalModal.waitFor({ state: 'hidden' }).catch(async () => {
        await personalModal.getByRole('button', { name: 'Cancelar' }).click();
      });

      // Alunos & Modal de Detalhes do Aluno
      await navigateSidebar(page, '/alunos');
      await capture(page, '02-admin/04-alunos-lista.png');

      await page.getByText('Ana Silva').first().click();
      const studentDetailModal = page.locator('[role="dialog"]');
      await studentDetailModal.waitFor({ state: 'visible' });
      await settle(page, 450);
      await capture(page, '02-admin/05-alunos-detalhe-modal.png');
      await page.keyboard.press('Escape');
      await studentDetailModal.waitFor({ state: 'hidden' });

      // Treinos & Aparelhos
      await navigateSidebar(page, '/treinos');
      await capture(page, '02-admin/06-treinos-lista.png');

      await navigateSidebar(page, '/aparelhos');
      await capture(page, '02-admin/07-aparelhos-lista.png');

      // Configurações (Identidade Visual — página expandida)
      await navigateSidebar(page, '/configuracoes');
      await captureExpandedMain(page, '02-admin/08-configuracoes-identidade.png');

      // Modo Escuro no Dashboard
      await navigateSidebar(page, '/dashboard');
      await page.locator('button[title="Modo escuro"]').click();
      await settle(page, 600);
      await capture(page, '02-admin/09-dashboard-modo-escuro.png');

      await context.close();
    }

    // ============================================================
    // JORNADA 3: Personal Trainer
    // ============================================================
    console.log('\n🔹 Capturando Jornada 3 — Personal Trainer...');
    {
      const context = await newDesktopContext(browser);
      const page = await context.newPage();
      attachErrorListener(page, 'personal');

      await waitForSeed(page, baseUrl);
      await loginAs(page, 'personal');
      await capture(page, '03-personal/01-dashboard-personal.png');

      // Treinos — Modal Novo Treino
      await navigateSidebar(page, '/treinos');
      await page.getByRole('button', { name: /Novo Treino/i }).click();
      const workoutModal = page.locator('[role="dialog"]');
      await workoutModal.waitFor({ state: 'visible' });
      await workoutModal.getByPlaceholder('Ex: Treino A - Superior').fill('Treino C - Costas & Bíceps');
      await workoutModal.locator('select').selectOption({ index: 2 });
      await workoutModal.getByPlaceholder('Ex: Peito / Tríceps').fill('Costas / Bíceps');
      await workoutModal
        .getByPlaceholder('Ex: Foco em hipertrofia e tempo sob tensão')
        .fill('Controle excêntrico de 3s nas remadas');
      await workoutModal.getByRole('button', { name: /\+ Adicionar exercício/i }).click();
      await workoutModal.getByPlaceholder('Buscar exercício por nome ou músculo...').fill('Remada');
      await page.waitForTimeout(250);
      await workoutModal.locator('.max-h-40 button').first().click();
      await settle(page, 450);
      await capture(page, '03-personal/02-treinos-modal-novo.png');
      await page.keyboard.press('Escape');
      await workoutModal.waitFor({ state: 'hidden' });

      // Treinos — Modal Prescrever para Aluno(s)
      await page.getByRole('button', { name: 'Prescrever' }).first().click();
      const prescribeModal = page.locator('[role="dialog"]');
      await prescribeModal.waitFor({ state: 'visible' });
      await settle(page, 350);
      await prescribeModal.getByText('Pedro Santos').first().click();
      await prescribeModal.getByText('Mariana Costa').first().click();
      await settle(page, 350);
      await capture(page, '03-personal/03-treinos-modal-prescrever.png');
      await page.keyboard.press('Escape');
      await prescribeModal.waitFor({ state: 'hidden' });

      // Exercícios — Filtros expandidos & Modal Exercício Customizado
      await navigateSidebar(page, '/exercicios');
      await page.getByRole('button', { name: /Filtros/i }).click();
      await settle(page, 450);
      await capture(page, '03-personal/04-exercicios-catalogo-filtros.png');

      await page.getByRole('button', { name: /Novo Exercício Personalizado/i }).click();
      const customExModal = page.locator('[role="dialog"]');
      await customExModal.waitFor({ state: 'visible' });
      await customExModal
        .getByPlaceholder('Ex: Supino Inclinado com Halteres Pronado')
        .fill('Elevação Lateral Unilateral na Polia');
      await customExModal.locator('select').nth(0).selectOption('Ombros');
      await customExModal
        .getByPlaceholder('Ex: Peitoral maior clavicular, deltóide anterior, tríceps')
        .fill('Deltóide lateral, supraespinal');
      await customExModal
        .getByPlaceholder('Descreva a postura, amplitude de movimento e dicas de respiração...')
        .fill('Manter tronco firme e realizar abdução controlada até a linha do ombro.');
      await settle(page, 450);
      await capture(page, '03-personal/05-exercicios-modal-custom.png');
      await page.keyboard.press('Escape');
      await customExModal.waitFor({ state: 'hidden' });

      // Evolução Física (Chart.js — página expandida)
      await navigateSidebar(page, '/evolucao');
      await page.locator('canvas').waitFor({ state: 'visible' });
      await settle(page, 1000);
      await captureExpandedMain(page, '03-personal/06-evolucao-alunos.png');

      // Aparelhos — Modal Novo Aparelho
      await navigateSidebar(page, '/aparelhos');
      await page.getByRole('button', { name: /Novo Aparelho/i }).click();
      const equipModal = page.locator('[role="dialog"]');
      await equipModal.waitFor({ state: 'visible' });
      await equipModal
        .getByPlaceholder('Ex: Leg Press 45°, Cadeira Extensora, Smith Machine')
        .fill('Remada Cavalinho Articulada');
      await equipModal.getByPlaceholder('Ex: Movement, Matrix').fill('Technogym');
      await equipModal.getByPlaceholder('Ex: RT 250, Linha Pró').fill('Pure Strength');
      await equipModal
        .getByPlaceholder('Ex: Piso 1, Andar 2, Área Maromba, Setor Cardio')
        .fill('Área Maromba - Piso 1');
      await equipModal
        .getByPlaceholder('Ex: Capacidade 450kg, cabos novos')
        .fill('Pegada neutra e pronada');
      await settle(page, 450);
      await capture(page, '03-personal/07-aparelhos-modal-novo.png');
      await page.keyboard.press('Escape');
      await equipModal.waitFor({ state: 'hidden' });

      // Histórico & Auditoria (Log de Atividades)
      await navigateSidebar(page, '/historico');
      await page.getByRole('button', { name: /Log de Atividades/i }).click();
      await settle(page, 450);
      await capture(page, '03-personal/08-historico-auditoria.png');

      await context.close();
    }

    // ============================================================
    // JORNADA 4: Aluno (Desktop + Mobile PWA)
    // ============================================================
    console.log('\n🔹 Capturando Jornada 4 — Aluno (Desktop)...');
    {
      const context = await newDesktopContext(browser);
      const page = await context.newPage();
      attachErrorListener(page, 'aluno-desktop');

      await waitForSeed(page, baseUrl);
      await loginAs(page, 'aluno');
      await capture(page, '04-aluno/01-dashboard-aluno.png');

      // Meus Treinos
      await navigateSidebar(page, '/meus-treinos');
      await capture(page, '04-aluno/02-meus-treinos.png');

      // Ver Ficha detalhada
      await page.getByRole('button', { name: 'Ver Ficha' }).first().click();
      const workoutDetailModal = page.locator('[role="dialog"]');
      await workoutDetailModal.waitFor({ state: 'visible' });
      await settle(page, 450);
      await capture(page, '04-aluno/03-treino-detalhe-modal.png');

      // Iniciar Treino Ativo
      await workoutDetailModal.getByRole('button', { name: /Iniciar Treino/i }).click();
      await page.waitForURL('**/treino-ativo/**', { timeout: 10000 });
      await page.getByText('Progresso Geral:').waitFor({ state: 'visible' });
      await settle(page, 700);

      // Concluir 2 séries para disparar barra de progresso + volume + RestTimerOverlay
      const setButtons = page.locator('button[title="Concluir série"]');
      await setButtons.nth(0).click();
      await page.waitForTimeout(250);
      await setButtons.nth(0).click();
      await page.getByText('Descanso').first().waitFor({ state: 'visible' });
      await settle(page, 600);
      await capture(page, '04-aluno/04-treino-ativo-execucao.png');

      // Abrir modal Finalizar Treino
      await page.getByRole('button', { name: /Finalizar Treino/i }).click();
      const finishModal = page.locator('[role="dialog"]').last();
      await finishModal.waitFor({ state: 'visible' });
      await finishModal
        .getByPlaceholder('Como foi o treino? Registre suas cargas ou observações...')
        .fill('Treino excelente, carga controlada e bom pump!');
      await settle(page, 450);
      await capture(page, '04-aluno/05-treino-ativo-finalizar.png');

      // Compartilhar no Instagram (WorkoutShareModal)
      await finishModal.getByRole('button', { name: /Gerar Post \/ Compartilhar no Instagram/i }).click();
      const shareModal = page.locator('[role="dialog"]').last();
      await shareModal.getByText('Gerar Post para Instagram').waitFor({ state: 'visible' });
      await settle(page, 900);
      await capture(page, '04-aluno/06-treino-compartilhar-instagram.png');
      await shareModal.getByRole('button', { name: 'Voltar' }).click();
      await settle(page, 300);

      // Confirmar & Salvar sessão e conferir no Histórico
      await finishModal.getByRole('button', { name: /Confirmar & Salvar/i }).click();
      await page.waitForURL('**/meus-treinos', { timeout: 10000 });
      await settle(page, 600);
      await dismissToasts(page);
      await navigateSidebar(page, '/historico');
      await capture(page, '04-aluno/07-meu-historico-sessoes.png');

      // Minha Evolução (Chart.js — página expandida)
      await navigateSidebar(page, '/evolucao');
      await page.locator('canvas').waitFor({ state: 'visible' });
      await settle(page, 1000);
      await captureExpandedMain(page, '04-aluno/08-minha-evolucao.png');

      // Catálogo de Exercícios -> Detalhe do Exercício
      await navigateSidebar(page, '/exercicios');
      await page.locator('.grid > div').first().click();
      const exDetailModal = page.locator('[role="dialog"]');
      await exDetailModal.waitFor({ state: 'visible' });
      await settle(page, 600);
      await capture(page, '04-aluno/09-exercicios-detalhe.png');
      await page.keyboard.press('Escape');
      await exDetailModal.waitFor({ state: 'hidden' });

      // Meu Perfil & Avatar (aba Avatares)
      await dismissToasts(page);
      await page.locator('#user-menu-btn').click();
      await page.getByRole('button', { name: /Meu Perfil & Avatar/i }).click();
      const profileModal = page.locator('[role="dialog"]');
      await profileModal.waitFor({ state: 'visible' });
      await profileModal.getByRole('button', { name: /Escolher Avatar Gym/i }).click();
      await settle(page, 450);
      await capture(page, '04-aluno/10-meu-perfil-avatar.png');

      await context.close();
    }

    // ============================================================
    // JORNADA 4B: Aluno Mobile PWA (390x844)
    // ============================================================
    console.log('\n🔹 Capturando Jornada 4B — Aluno Mobile PWA (390x844)...');
    {
      const context = await newMobileContext(browser);
      const page = await context.newPage();
      attachErrorListener(page, 'aluno-mobile');

      await waitForSeed(page, baseUrl);
      await loginAs(page, 'aluno');
      await capture(page, '04-aluno/11-mobile-dashboard-aluno.png');

      await page.getByRole('button', { name: /Iniciar Treino de Hoje/i }).click();
      await page.waitForURL('**/treino-ativo/**', { timeout: 10000 });
      await page.getByText('Progresso Geral:').waitFor({ state: 'visible' });
      await settle(page, 700);

      await page.locator('button[title="Concluir série"]').first().click();
      await page.getByText('Descanso').first().waitFor({ state: 'visible' });
      await settle(page, 600);
      await capture(page, '04-aluno/12-mobile-treino-ativo.png');

      await context.close();
    }

    if (pageErrors.length > 0) {
      console.error('\n❌ Erros de runtime detectados durante a captura:');
      for (const err of pageErrors) {
        console.error('  -', err);
      }
      process.exitCode = 1;
    } else {
      console.log('\n✅ Todas as jornadas foram capturadas com sucesso e sem erros de página!');
    }
  } finally {
    await browser.close();
    if (serverInfo) {
      stopServer(serverInfo.child);
      console.log('🛑 Servidor Vite preview encerrado.');
    }
  }
}

main().catch(err => {
  console.error('Erro fatal ao capturar jornadas:', err);
  process.exit(1);
});
