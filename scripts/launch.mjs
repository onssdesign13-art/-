#!/usr/bin/env node
/**
 * Launcher for one-click start (double-click the file in the project folder).
 *
 *   node scripts/launch.mjs            # production: build if needed, start, open browser
 *   node scripts/launch.mjs --dev      # dev server with hot reload
 *   node scripts/launch.mjs --port=4000
 *   node scripts/launch.mjs --seed     # add demo data if the database is empty
 *
 * What it does: checks Node/npm, creates .env.local with a generated admin
 * password on first run, installs dependencies if missing, builds the app when
 * there is no production build, picks a free port, waits until the site answers
 * and opens the browser.
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const argv = process.argv.slice(2);
const useDevServer = argv.includes("--dev");
const skipBrowser = argv.includes("--no-open");
const seedDemo = argv.includes("--seed");
const portArg = argv.find((value) => value.startsWith("--port="));
const preferredPort = Number(portArg?.split("=")[1]) || 3000;
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

const line = (char = "-") => console.log(char.repeat(64));

function step(text) {
  console.log(`\n> ${text}`);
}

function done(text) {
  console.log(`  ok  ${text}`);
}

function passwordChunk(length) {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(length))
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
}

function readEnvFile() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(raw);
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

/** Creates .env.local on the first run and returns the parsed values. */
function ensureEnvFile() {
  const file = path.join(ROOT, ".env.local");
  if (fs.existsSync(file)) return readEnvFile();
  const password = `${passwordChunk(4)}-${passwordChunk(4)}`;
  const secret = crypto.randomBytes(32).toString("base64url");
  fs.writeFileSync(
    file,
    [
      "# Создано автоматически при первом запуске.",
      `# Пароль для входа в панель /admin: ${password}`,
      `ADMIN_PASSWORD=${password}`,
      `SESSION_SECRET=${secret}`,
      "BASE_URL=http://localhost:3000",
      "DATA_DIR=./data",
      "BRAND_NAME=OBJET",
      "",
    ].join("\n"),
    "utf8",
  );
  return readEnvFile();
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", cwd: ROOT, shell: false });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} завершился с кодом ${code}`)),
    );
  });
}

function portFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

async function httpStatus(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/admin/login`, {
      signal: AbortSignal.timeout(1500),
    });
    return response.status;
  } catch {
    return null;
  }
}

async function choosePort() {
  // 1. Может быть, сайт уже поднят (тогда просто открываем браузер).
  for (let port = preferredPort; port < preferredPort + 5; port += 1) {
    if ((await httpStatus(port)) === 200) return { port, alreadyRunning: true };
  }
  // 2. Ищем первый свободный порт, если 3000 занят чем-то другим.
  for (let port = preferredPort; port < preferredPort + 10; port += 1) {
    if (await portFree(port)) return { port, alreadyRunning: false };
  }
  return { port: preferredPort, alreadyRunning: false };
}

function openBrowser(url) {
  if (skipBrowser) return;
  try {
    const [command, args] =
      process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : process.platform === "darwin"
          ? ["open", [url]]
          : ["xdg-open", [url]];
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
  } catch {
    /* браузер откроется вручную */
  }
}

async function waitForSite(port, timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await httpStatus(port);
    if (status === 200) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function main() {
  line("=");
  console.log("  OBJET — паспорта объектов. Локальный запуск");
  line("=");

  if (Number(process.versions.node.split(".")[0]) < 20) {
    console.log("\n  Нужен Node.js 20 или новее. Установите LTS с https://nodejs.org");
    process.exit(1);
  }

  step("Проверяю настройки (.env.local)");
  const env = ensureEnvFile();
  const password = env.ADMIN_PASSWORD || "admin";
  done("настройки на месте");

  step("Проверяю зависимости");
  if (!fs.existsSync(path.join(ROOT, "node_modules", "next"))) {
    console.log("  устанавливаю (это может занять пару минут, только при первом запуске)…");
    await run(NPM, ["install", "--no-audit", "--no-fund"]);
  }
  done("зависимости готовы");

  if (!useDevServer) {
    step("Проверяю сборку");
    if (!fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
      console.log("  собираю сайт (первый раз занимает ~30 секунд)…");
      await run(NPM, ["run", "build"]);
    }
    done("сборка готова");
  }

  if (seedDemo && !fs.existsSync(path.join(ROOT, "data", "app.db"))) {
    step("Добавляю демо-данные");
    await run(NPM, ["run", "seed"]);
  }

  step("Ищу свободный порт");
  const { port, alreadyRunning } = await choosePort();
  const url = `http://localhost:${port}`;
  if (alreadyRunning) {
    done(`сайт уже запущен на ${url}`);
    openBrowser(url);
    console.log(`\n  Если это не ваш сайт — запустите: node scripts/launch.mjs --port=3100`);
    return;
  }
  done(`порт ${port}`);

  // While the site is local, keep BASE_URL in sync with the actual port
  // so QR codes point to the right place. A real domain is never overwritten.
  const envBase = env.BASE_URL || "";
  const baseUrl = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(envBase) || !envBase
    ? `http://localhost:${port}`
    : envBase;

  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(
    process.execPath,
    [nextBin, useDevServer ? "dev" : "start", "-p", String(port)],
    {
      cwd: ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        ...env,
        NODE_ENV: useDevServer ? "development" : "production",
        BASE_URL: baseUrl,
      },
    },
  );

  const stop = () => {
    child.kill("SIGTERM");
    setTimeout(() => process.exit(0), 300);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", (code) => process.exit(code ?? 0));

  step("Запускаю сайт");
  const up = await waitForSite(port);
  if (up) {
    openBrowser(url);
    line("=");
    console.log(`  Сайт работает:      ${url}`);
    console.log(`  Посмотреть объект:  ${url}/o/<код из панели>`);
    console.log(`  Панель админа:      ${url}/admin`);
    console.log(`  Пароль админа:      ${password}`);
    console.log(`  (пароль также лежит в файле .env.local)`);
    line("=");
    console.log("  Остановить: закройте это окно или нажмите Ctrl+C\n");
  } else {
    console.log("\n  Сайт не ответил за 2 минуты — смотрите сообщения выше.");
  }
}

main().catch((error) => {
  console.error(`\n  Не удалось запустить: ${error.message}`);
  console.error("  Первый запуск требует интернет (скачиваются зависимости).");
  process.exit(1);
});
