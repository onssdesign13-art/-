#!/usr/bin/env node
/**
 * Demo data generator: 3 collections, 6 objects, their pages and placeholder photos.
 * Safe to run once on a fresh database; it does not wipe existing rows.
 *
 *   node scripts/seed.mjs
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "app.db"));
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.resolve("src/lib/schema.sql"), "utf8"));

const now = new Date().toISOString();
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const code = (n = 8) =>
  Array.from(crypto.randomBytes(n))
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join("");

/** Minimal Swiss-style placeholder art so the pages look plausible before real photos. */
function placeholderSvg({ label, hue, shape }) {
  const shapes = {
    vase: `<path d="M160 120 C110 190 120 330 200 400 C280 330 290 190 240 120 Z" fill="hsl(${hue} 12% 22%)"/>
           <rect x="188" y="96" width="24" height="30" fill="hsl(${hue} 10% 30%)"/>`,
    lamp: `<rect x="196" y="90" width="8" height="210" fill="hsl(${hue} 10% 25%)"/>
           <path d="M120 300 L280 300 L250 380 L150 380 Z" fill="hsl(${hue} 14% 20%)"/>
           <circle cx="200" cy="112" r="52" fill="none" stroke="hsl(${hue} 12% 24%)" stroke-width="6"/>`,
    object: `<circle cx="200" cy="240" r="110" fill="hsl(${hue} 12% 22%)"/>
             <rect x="60" y="360" width="280" height="6" fill="hsl(${hue} 10% 30%)"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="800" height="1000">
  <rect width="400" height="500" fill="#f2f2ef"/>
  <g stroke="#d9d9d4" stroke-width="1">
    <line x1="0" y1="125" x2="400" y2="125"/>
    <line x1="0" y1="250" x2="400" y2="250"/>
    <line x1="0" y1="375" x2="400" y2="375"/>
    <line x1="100" y1="0" x2="100" y2="500"/>
    <line x1="200" y1="0" x2="200" y2="500"/>
    <line x1="300" y1="0" x2="300" y2="500"/>
  </g>
  ${shapes[shape] ?? shapes.object}
  <text x="24" y="470" font-family="Helvetica, Arial" font-size="14" letter-spacing="2" fill="#6e6e6e">${label}</text>
</svg>`;
}

function addMedia(svg, name) {
  const filename = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString("hex")}.svg`;
  const bytes = Buffer.from(svg, "utf8");
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), bytes);
  const info = db
    .prepare(
      `INSERT INTO media (filename, original_name, mime, bytes, width, height, created_at)
       VALUES (?, ?, 'image/svg+xml', ?, 800, 1000, ?)`,
    )
    .run(filename, name, bytes.byteLength, now);
  return Number(info.lastInsertRowid);
}

function addCollection(name, slug, release, description, coverSvg) {
  const cover = coverSvg ? addMedia(coverSvg, `${slug}.svg`) : null;
  const info = db
    .prepare(
      `INSERT INTO collections (name, slug, release_date, description, cover_media_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(name, slug, release, description, cover, now, now);
  return Number(info.lastInsertRowid);
}

function addProduct(product) {
  const info = db
    .prepare(
      `INSERT INTO products
        (name, slug, code, collection_id, category, material, dimensions, year, description,
         limited, edition_size, show_edition_count, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    )
    .run(
      product.name,
      product.slug,
      code(),
      product.collectionId,
      product.category,
      product.material,
      product.dimensions,
      product.year,
      product.description,
      product.limited ? 1 : 0,
      product.limited ? product.editionSize : null,
      product.showEditionCount === false ? 0 : 1,
      now,
      now,
    );
  const id = Number(info.lastInsertRowid);
  for (const [index, mediaId] of product.media.entries()) {
    db.prepare(
      "INSERT INTO product_media (product_id, media_id, position) VALUES (?, ?, ?)",
    ).run(id, mediaId, index);
  }
  for (let serial = 1; serial <= product.pages; serial += 1) {
    db.prepare(
      `INSERT INTO pages (product_id, serial, code, label, status, created_at)
       VALUES (?, ?, ?, NULL, 'active', ?)`,
    ).run(id, serial, code(), now);
  }
  return id;
}

const existing = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
if (existing > 0) {
  console.log(`В базе уже ${existing} объектов — демо-данные не добавлены (это защита от дублей).`);
  process.exit(0);
}

const terra = addCollection(
  "TERRA",
  "terra",
  "2025-03-12",
  "Серия о спечённой глине: матовые поверхности, глухие объёмы.",
  placeholderSvg({ label: "TERRA", hue: 20, shape: "vase" }),
);
const monolith = addCollection(
  "MONOLITH",
  "monolith",
  "2024-10-01",
  "Тяжёлые формы и один вертикальный жест.",
  placeholderSvg({ label: "MONOLITH", hue: 210, shape: "object" }),
);
const nocturne = addCollection(
  "NOCTURNE",
  "nocturne",
  "2023-09-05",
  "Свет как объект: лампы с закрытым источником.",
  placeholderSvg({ label: "NOCTURNE", hue: 280, shape: "lamp" }),
);

const catalogue = [
  {
    name: "Ваза TERRA 01",
    slug: "vase-terra-01",
    collectionId: terra,
    category: "Ваза",
    material: "Керамика, матовая глазурь",
    dimensions: "H 42 × D 18 см",
    year: 2025,
    description: "Высокий глухой объём с необработанной кромкой.",
    limited: true,
    editionSize: 100,
    pages: 3,
    media: [addMedia(placeholderSvg({ label: "TERRA 01", hue: 20, shape: "vase" }), "terra-01.svg")],
  },
  {
    name: "Ваза TERRA 02",
    slug: "vase-terra-02",
    collectionId: terra,
    category: "Ваза",
    material: "Керамика, шамот",
    dimensions: "H 28 × D 24 см",
    year: 2025,
    description: "Приземистая форма, следы ручной лепки.",
    limited: false,
    editionSize: null,
    pages: 4,
    media: [addMedia(placeholderSvg({ label: "TERRA 02", hue: 30, shape: "vase" }), "terra-02.svg")],
  },
  {
    name: "Объект MONOLITH 03",
    slug: "object-monolith-03",
    collectionId: monolith,
    category: "Объект",
    material: "Бетон, сталь",
    dimensions: "H 55 × W 20 см",
    year: 2024,
    description: "Вертикальный объём с полированной кромкой.",
    limited: true,
    editionSize: 25,
    pages: 2,
    media: [addMedia(placeholderSvg({ label: "MONOLITH 03", hue: 210, shape: "object" }), "monolith-03.svg")],
  },
  {
    name: "Лампа NOCTURNE 07",
    slug: "lamp-nocturne-07",
    collectionId: nocturne,
    category: "Лампа",
    material: "Латунь, опаловое стекло",
    dimensions: "H 38 × D 26 см",
    year: 2023,
    description: "Свет уходит вниз, корпус остаётся тёмным.",
    limited: false,
    editionSize: null,
    pages: 6,
    media: [addMedia(placeholderSvg({ label: "NOCTURNE 07", hue: 280, shape: "lamp" }), "nocturne-07.svg")],
  },
  {
    name: "Подсвечник NOCTURNE 02",
    slug: "candle-nocturne-02",
    collectionId: nocturne,
    category: "Подсвечник",
    material: "Латунь",
    dimensions: "H 12 × D 9 см",
    year: 2023,
    description: "Парный объект для серии NOCTURNE.",
    limited: false,
    editionSize: null,
    pages: 2,
    media: [addMedia(placeholderSvg({ label: "NOCTURNE 02", hue: 300, shape: "object" }), "nocturne-02.svg")],
  },
];

for (const product of catalogue) addProduct(product);

console.log(
  `Готово: ${db.prepare("SELECT COUNT(*) AS n FROM collections").get().n} коллекции, ` +
    `${db.prepare("SELECT COUNT(*) AS n FROM products").get().n} объектов, ` +
    `${db.prepare("SELECT COUNT(*) AS n FROM pages").get().n} страниц.`,
);
