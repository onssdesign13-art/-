#!/usr/bin/env node
/**
 * End-to-end smoke test: boots the production build on a scratch database and
 * walks the whole flow (login -> collection -> object -> pages -> public page ->
 * QR -> upload -> print -> deletion).
 *
 *   npm run build && npm run smoke
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.SMOKE_PORT || 3311);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = "./data-smoke";
const PASSWORD = "smoke-password";

let passed = 0;
const failures = [];

function check(name, condition, extra = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${extra ? ` — ${extra}` : ""}`);
    console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

let cookie = "";

async function req(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (cookie) headers.cookie = cookie;
  if (options.json !== undefined) {
    headers["content-type"] = "application/json";
    options.body = JSON.stringify(options.json);
  }
  const response = await fetch(`${BASE}${url}`, {
    ...options,
    headers,
    redirect: options.redirect ?? "manual",
  });
  const setCookie = response.headers.getSetCookie?.() ?? [];
  if (setCookie.length > 0) {
    cookie = setCookie.map((value) => value.split(";")[0]).join("; ");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = buffer.toString("utf8");
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, headers: response.headers, text, json, buffer };
}

async function waitForServer(timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${BASE}/admin/login`);
      if (response.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

fs.rmSync(path.resolve(DATA_DIR), { recursive: true, force: true });

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATA_DIR,
      ADMIN_PASSWORD: PASSWORD,
      SESSION_SECRET: "smoke-test-secret-value-please-ignore-1234567890",
      BASE_URL: BASE,
      INSECURE_COOKIES: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
server.stdout.on("data", () => {});
server.stderr.on("data", (chunk) => process.stderr.write(`[server] ${chunk}`));

function shutdown(code) {
  try {
    server.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  setTimeout(() => process.exit(code), 200);
}

(async () => {
  const ready = await waitForServer();
  if (!ready) {
    console.error("Сервер не поднялся на порту", PORT);
    shutdown(1);
    return;
  }

  section("Доступ и авторизация");
  const guard = await req("/admin");
  check("неавторизованный /admin редиректит на логин", guard.status === 307 && (guard.headers.get("location") || "").includes("/admin/login"));
  const apiGuard = await req("/api/admin/products");
  check("неавторизованный API отвечает 401", apiGuard.status === 401);
  const wrongLogin = await req("/api/auth/login", { method: "POST", json: { password: "nope" } });
  check("неверный пароль отклонён", wrongLogin.status === 401);
  const login = await req("/api/auth/login", { method: "POST", json: { password: PASSWORD } });
  check("верный пароль принимается", login.status === 200 && cookie.includes("objet_admin="));
  const adminPage = await req("/admin/products");
  check("страница объектов открывается после входа", adminPage.status === 200 && adminPage.text.includes("Новый объект"));

  section("Коллекция и объект");
  const collection = await req("/api/admin/collections", {
    method: "POST",
    json: { name: "TERRA", release_date: "2025-03-12", description: "Тестовая серия" },
  });
  check("коллекция создана", collection.status === 201 && collection.json?.collection?.id > 0);
  const collectionId = collection.json.collection.id;

  const product = await req("/api/admin/products", {
    method: "POST",
    json: {
      name: "Ваза TERRA 01",
      collection_id: collectionId,
      category: "Ваза",
      material: "Керамика",
      dimensions: "H 42 × D 18 см",
      year: 2025,
      limited: true,
      edition_size: 100,
    },
  });
  check("лимитированный объект создан", product.status === 201 && product.json?.product?.limited === 1);
  const productId = product.json.product.id;
  const productCode = product.json.product.code;
  check("объекту выдан публичный код", typeof productCode === "string" && productCode.length === 8);

  const badLimited = await req("/api/admin/products", {
    method: "POST",
    json: { name: "Без тиража", limited: true },
  });
  check("лимитированный объект без тиража отклонён", badLimited.status === 400);

  section("Страницы и серийность");
  const pages = await req(`/api/admin/products/${productId}/pages`, {
    method: "POST",
    json: { count: 3 },
  });
  check("создано 3 страницы", pages.status === 201 && pages.json?.pages?.length === 3);
  const serials = (pages.json?.pages ?? []).map((page) => page.serial);
  check("серийные номера идут 1,2,3", JSON.stringify(serials) === JSON.stringify([1, 2, 3]));
  const firstPage = pages.json.pages[0];
  const secondPage = pages.json.pages[1];
  check("коды страниц уникальны", new Set(pages.json.pages.map((page) => page.code)).size === 3);

  const outOfEdition = await req(`/api/admin/products/${productId}/pages`, {
    method: "POST",
    json: { serial: 101 },
  });
  check("номер вне тиража отклонён", outOfEdition.status === 400);
  const duplicate = await req(`/api/admin/products/${productId}/pages`, {
    method: "POST",
    json: { serial: 1 },
  });
  check("дубликат номера отклонён", duplicate.status === 400);
  const lastInEdition = await req(`/api/admin/products/${productId}/pages`, {
    method: "POST",
    json: { serial: 100 },
  });
  check("номер 100 в тираже принят", lastInEdition.status === 201);
  await req(`/api/admin/pages/${lastInEdition.json.pages[0].id}`, { method: "DELETE" });

  section("Сгенерированная страница");
  const publicPage = await req(`/o/${firstPage.code}`);
  check("страница объекта отдаётся 200", publicPage.status === 200);
  check("на странице есть название объекта", publicPage.text.includes("Ваза TERRA 01"));
  check("на странице есть коллекция", publicPage.text.includes("TERRA"));
  check("на странице есть номер в серии 01 / 100", /01\s*\/\s*100/.test(publicPage.text));
  check("на странице есть метка лимитированной серии", publicPage.text.includes("Лимитированная серия"));
  check("на странице есть материал и размеры", publicPage.text.includes("Керамика") && publicPage.text.includes("H 42"));
  check("на странице есть код объекта", publicPage.text.includes(productCode));

  const prettyUrl = await req(`/o/vaza-terra-01-${firstPage.code}`);
  check("человекопонятный адрес тоже работает", prettyUrl.status === 200);

  const missing = await req("/o/ZZZZZZZZ");
  check("несуществующий код даёт 404", missing.status === 404 && missing.text.includes("не найден"));

  section("QR-коды");
  const qrData = await req(`/api/admin/pages/${firstPage.id}/qr?data=1`);
  check(
    "QR ведёт на публичный адрес",
    qrData.json?.url === `${BASE}/o/${firstPage.code}`,
    qrData.json?.url,
  );
  const qrPng = await req(`/api/admin/pages/${firstPage.id}/qr?format=png&size=512`);
  check("PNG QR отдаётся", qrPng.status === 200 && qrPng.headers.get("content-type") === "image/png");
  check(
    "PNG QR — валидный PNG",
    qrPng.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  );
  const qrSvg = await req(`/api/admin/pages/${firstPage.id}/qr?format=svg&download=1`);
  check(
    "SVG QR отдаётся и предлагается к скачиванию",
    qrSvg.status === 200 && qrSvg.text.includes("<svg") && (qrSvg.headers.get("content-disposition") || "").includes("attachment"),
  );

  section("Фотографии");
  const form = new FormData();
  form.append("file", new Blob([PNG_1PX], { type: "image/png" }), "photo.png");
  form.append("width", "1");
  form.append("height", "1");
  const upload = await fetch(`${BASE}/api/admin/upload`, { method: "POST", headers: { cookie }, body: form });
  const uploaded = await upload.json();
  check("фото загружено", upload.status === 201 && uploaded.media?.length === 1);
  const mediaId = uploaded.media[0].id;
  const mediaFilename = uploaded.media[0].filename;

  const attach = await req(`/api/admin/products/${productId}/photos`, {
    method: "PUT",
    json: { mediaIds: [mediaId] },
  });
  check("фото привязано к объекту", attach.status === 200 && attach.json?.photos?.length === 1);
  const mediaResponse = await req(`/media/${mediaFilename}`);
  check("файл фото отдаётся по /media", mediaResponse.status === 200 && mediaResponse.headers.get("content-type") === "image/png");
  const pageWithPhoto = await req(`/o/${firstPage.code}`);
  check("фото появилось на странице", pageWithPhoto.text.includes(`/media/${mediaFilename}`));
  const badUpload = new FormData();
  badUpload.append("file", new Blob([Buffer.from("hello")], { type: "text/plain" }), "note.txt");
  const badUploadResponse = await fetch(`${BASE}/api/admin/upload`, {
    method: "POST",
    headers: { cookie },
    body: badUpload,
  });
  check("неподдерживаемый формат отклонён", badUploadResponse.status === 400);

  section("Открытая серия");
  const openProduct = await req("/api/admin/products", {
    method: "POST",
    json: { name: "Лампа NOCTURNE 07", collection_id: collectionId, category: "Лампа" },
  });
  const openId = openProduct.json.product.id;
  await req(`/api/admin/products/${openId}/pages`, { method: "POST", json: { count: 2 } });
  const openPages = await req(`/api/admin/products/${openId}/pages`);
  const openPage = openPages.json.pages[0];
  const openPublic = await req(`/o/${openPage.code}`);
  check("открытая серия показывает знаменатель = число страниц", /01\s*\/\s*2/.test(openPublic.text));
  check("открытая серия помечена как таковая", openPublic.text.includes("Открытая серия"));

  section("Печать паспорта");
  const print = await req(`/print/${firstPage.id}`);
  check("страница печати открывается", print.status === 200);
  check("на паспорте есть формат A6 и QR", print.text.includes("sheet") && print.text.includes("data:image/png;base64"));
  check("на паспорте есть номер и бренд", print.text.includes("01 / 100") && print.text.includes("OBJET"));

  section("Поиск, сортировка и список");
  const search = await req("/api/admin/products?q=NOCTURNE");
  check("поиск по названию работает", search.json?.products?.length === 1);
  const byCollection = await req(`/api/admin/products?collection=${collectionId}&sort=release_desc`);
  check("фильтр по коллекции + сортировка по релизу работают", byCollection.json?.products?.length === 2);
  const sorted = await req("/api/admin/products?sort=name_asc");
  check("сортировка по имени работает", sorted.json?.products?.[0]?.name === "Ваза TERRA 01");
  const listHtml = await req("/admin/products?collection=" + collectionId);
  check("админ-список рендерится с фильтром", listHtml.status === 200 && listHtml.text.includes("Ваза TERRA 01"));

  section("Настройки бренда");
  const settingsPatch = await req("/api/admin/settings", {
    method: "PATCH",
    json: { brand_name: "ATELIER X", accent: "#0B5FFF", base_url: "https://passport.example.com" },
  });
  check("настройки сохраняются", settingsPatch.status === 200 && settingsPatch.json?.settings?.brand_name === "ATELIER X");
  const rebranded = await req(`/o/${firstPage.code}`);
  check("бренд и акцент применяются на странице", rebranded.text.includes("ATELIER X") && rebranded.text.includes("11 95 255"));
  const qrAfter = await req(`/api/admin/pages/${firstPage.id}/qr?data=1`);
  check(
    "QR перегенерируется на новый домен",
    qrAfter.json?.url === `https://passport.example.com/o/${firstPage.code}`,
    qrAfter.json?.url,
  );

  section("Удаление");
  const deletePage = await req(`/api/admin/pages/${secondPage.id}`, { method: "DELETE" });
  check("страница удаляется", deletePage.status === 200);
  const gone = await req(`/o/${secondPage.code}`);
  check("удалённая страница даёт 404", gone.status === 404);
  const remaining = await req(`/api/admin/products/${productId}/pages`);
  check(
    "после удаления остались страницы с номерами 1 и 3",
    JSON.stringify(remaining.json?.pages?.map((page) => page.serial)) === JSON.stringify([1, 3]),
  );
  const openPublicAfter = await req(`/o/${openPage.code}`);
  check("знаменатель открытой серии пересчитался", /01\s*\/\s*2/.test(openPublicAfter.text));

  const deleteCollection = await req(`/api/admin/collections/${collectionId}`, { method: "DELETE" });
  check("коллекция удаляется", deleteCollection.status === 200);
  const orphan = await req(`/api/admin/products/${productId}`);
  check("объект остался без коллекции", orphan.json?.product?.collection_id === null);

  const logout = await req("/api/auth/logout", { method: "POST" });
  check("выход выполняется", logout.status === 200);
  const afterLogout = await req("/api/admin/products");
  check("после выхода API закрыт", afterLogout.status === 401);

  console.log(`\n${passed} проверок пройдено, ${failures.length} провалено`);
  if (failures.length > 0) {
    console.log("\nПровалы:");
    for (const failure of failures) console.log(`  · ${failure}`);
  }
  shutdown(failures.length === 0 ? 0 : 1);
})().catch((error) => {
  console.error(error);
  shutdown(1);
});
