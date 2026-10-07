import { getDb } from "./db";
import { nowIso, publicCode, slugify } from "./ids";
import type {
  Collection,
  MediaRow,
  PageRow,
  PageSummary,
  Product,
  ProductStatus,
  ProductSummary,
} from "./types";

export class RepoError extends Error {}

/* ------------------------------------------------------------------ helpers */

function uniqueSlug(
  table: "products" | "collections",
  base: string,
  ignoreId?: number,
): string {
  const db = getDb();
  const root = slugify(base);
  let slug = root;
  let attempt = 2;
  for (;;) {
    const row = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug) as
      | { id: number }
      | undefined;
    if (!row || row.id === ignoreId) return slug;
    slug = `${root}-${attempt}`;
    attempt += 1;
  }
}

function uniqueCode(table: "products" | "pages"): string {
  const db = getDb();
  for (;;) {
    const code = publicCode();
    const row = db.prepare(`SELECT id FROM ${table} WHERE code = ?`).get(code);
    if (!row) return code;
  }
}

export function audit(
  action: string,
  entity?: string,
  entityId?: string | number,
  detail?: string,
) {
  getDb()
    .prepare(
      "INSERT INTO audit_log (at, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)",
    )
    .run(
      nowIso(),
      action,
      entity ?? null,
      entityId != null ? String(entityId) : null,
      detail ?? null,
    );
}

function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

/* -------------------------------------------------------------- collections */

export interface CollectionSummary extends Collection {
  products_count: number;
  pages_count: number;
  cover_filename: string | null;
}

const COLLECTION_SELECT = `
  SELECT c.*,
    (SELECT COUNT(*) FROM products p WHERE p.collection_id = c.id) AS products_count,
    (SELECT COUNT(*) FROM pages pg JOIN products p ON p.id = pg.product_id
       WHERE p.collection_id = c.id) AS pages_count,
    (SELECT m.filename FROM media m WHERE m.id = c.cover_media_id) AS cover_filename
  FROM collections c
`;

export function listCollections(): CollectionSummary[] {
  return getDb()
    .prepare(
      `${COLLECTION_SELECT}
       ORDER BY (c.release_date IS NULL), c.release_date DESC, c.name COLLATE NOCASE ASC`,
    )
    .all() as CollectionSummary[];
}

export function getCollection(id: number): CollectionSummary | null {
  return (
    (getDb().prepare(`${COLLECTION_SELECT} WHERE c.id = ?`).get(id) as
      | CollectionSummary
      | undefined) ?? null
  );
}

export interface CollectionInput {
  name: string;
  release_date?: string | null;
  description?: string | null;
  cover_media_id?: number | null;
}

export function createCollection(input: CollectionInput): CollectionSummary {
  const name = input.name?.trim();
  if (!name) throw new RepoError("Укажите название коллекции.");
  const now = nowIso();
  const info = getDb()
    .prepare(
      `INSERT INTO collections (name, slug, release_date, description, cover_media_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      uniqueSlug("collections", name),
      input.release_date || null,
      input.description?.trim() || null,
      input.cover_media_id ?? null,
      now,
      now,
    );
  audit("collection.create", "collection", Number(info.lastInsertRowid), name);
  return getCollection(Number(info.lastInsertRowid)) as CollectionSummary;
}

export function updateCollection(id: number, input: CollectionInput): CollectionSummary {
  const current = getCollection(id);
  if (!current) throw new RepoError("Коллекция не найдена.");
  const name = input.name?.trim() || current.name;
  getDb()
    .prepare(
      `UPDATE collections
         SET name = ?, slug = ?, release_date = ?, description = ?, cover_media_id = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      name,
      current.name === name ? current.slug : uniqueSlug("collections", name, id),
      input.release_date === undefined ? current.release_date : input.release_date || null,
      input.description === undefined
        ? current.description
        : input.description?.trim() || null,
      input.cover_media_id === undefined
        ? current.cover_media_id
        : input.cover_media_id ?? null,
      nowIso(),
      id,
    );
  audit("collection.update", "collection", id, name);
  return getCollection(id) as CollectionSummary;
}

export function deleteCollection(id: number): void {
  const db = getDb();
  // Products survive; they simply lose the collection link.
  db.prepare(
    "UPDATE products SET collection_id = NULL, updated_at = ? WHERE collection_id = ?",
  ).run(nowIso(), id);
  db.prepare("DELETE FROM collections WHERE id = ?").run(id);
  audit("collection.delete", "collection", id);
}

/* ----------------------------------------------------------------- products */

const PRODUCT_SELECT = `
  SELECT p.*,
    c.name AS collection_name,
    c.release_date AS collection_release_date,
    (SELECT COUNT(*) FROM pages pg WHERE pg.product_id = p.id) AS pages_count,
    (SELECT pm.media_id FROM product_media pm WHERE pm.product_id = p.id
       ORDER BY pm.position, pm.media_id LIMIT 1) AS cover_media_id,
    (SELECT m.filename FROM product_media pm JOIN media m ON m.id = pm.media_id
       WHERE pm.product_id = p.id ORDER BY pm.position, pm.media_id LIMIT 1) AS cover_filename,
    (SELECT COUNT(*) FROM product_media pm WHERE pm.product_id = p.id) AS photos_count
  FROM products p
  LEFT JOIN collections c ON c.id = p.collection_id
`;

const SORTS: Record<string, string> = {
  created_desc: "p.created_at DESC, p.id DESC",
  created_asc: "p.created_at ASC, p.id ASC",
  name_asc: "p.name COLLATE NOCASE ASC",
  name_desc: "p.name COLLATE NOCASE DESC",
  collection_asc: "(c.name IS NULL), c.name COLLATE NOCASE ASC, p.name COLLATE NOCASE ASC",
  collection_desc: "(c.name IS NULL), c.name COLLATE NOCASE DESC, p.name COLLATE NOCASE ASC",
  release_desc: "(c.release_date IS NULL) DESC, c.release_date DESC, p.name COLLATE NOCASE ASC",
  release_asc: "(c.release_date IS NULL), c.release_date ASC, p.name COLLATE NOCASE ASC",
  pages_desc: "pages_count DESC, p.name COLLATE NOCASE ASC",
  pages_asc: "pages_count ASC, p.name COLLATE NOCASE ASC",
};

export interface ProductFilter {
  q?: string;
  collectionId?: number | null;
  uncategorized?: boolean;
  status?: ProductStatus | "all";
  sort?: string;
}

export function listProducts(filter: ProductFilter = {}): ProductSummary[] {
  const where: string[] = [];
  const params: (string | number)[] = [];

  const q = filter.q?.trim();
  if (q) {
    where.push(
      `(p.name LIKE ? COLLATE NOCASE OR p.code LIKE ? COLLATE NOCASE
        OR IFNULL(p.category,'') LIKE ? COLLATE NOCASE
        OR IFNULL(p.material,'') LIKE ? COLLATE NOCASE
        OR IFNULL(p.dimensions,'') LIKE ? COLLATE NOCASE
        OR IFNULL(c.name,'') LIKE ? COLLATE NOCASE)`,
    );
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }
  if (filter.collectionId != null) {
    where.push("p.collection_id = ?");
    params.push(filter.collectionId);
  }
  if (filter.uncategorized) where.push("p.collection_id IS NULL");
  if (filter.status && filter.status !== "all") {
    where.push("p.status = ?");
    params.push(filter.status);
  }

  const order = SORTS[filter.sort ?? "created_desc"] ?? SORTS.created_desc;
  const sql = `${PRODUCT_SELECT} ${
    where.length ? `WHERE ${where.join(" AND ")}` : ""
  } ORDER BY ${order}`;
  return getDb()
    .prepare(sql)
    .all(...params) as ProductSummary[];
}

export function getProduct(id: number): ProductSummary | null {
  return (
    (getDb().prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(id) as
      | ProductSummary
      | undefined) ?? null
  );
}

export function getProductByCode(code: string): Product | null {
  return (
    (getDb().prepare("SELECT * FROM products WHERE code = ?").get(code) as
      | Product
      | undefined) ?? null
  );
}

export interface ProductInput {
  name: string;
  collection_id?: number | null;
  category?: string | null;
  material?: string | null;
  dimensions?: string | null;
  year?: number | null;
  description?: string | null;
  limited?: boolean | number;
  edition_size?: number | null;
  show_edition_count?: boolean | number;
  status?: ProductStatus;
}

export function normalizeEdition(input: ProductInput) {
  const limited = toBool(input.limited) ? 1 : 0;
  let editionSize: number | null = null;
  if (limited) {
    const parsed = Number(input.edition_size);
    editionSize = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
    if (!editionSize) {
      throw new RepoError("Для лимитированного объекта укажите тираж (например, 100).");
    }
  }
  const rawYear = input.year;
  const year =
    rawYear === null || rawYear === undefined || rawYear === ("" as unknown)
      ? null
      : Number(rawYear);
  return {
    limited,
    editionSize,
    showEditionCount:
      input.show_edition_count === undefined ? 1 : toBool(input.show_edition_count) ? 1 : 0,
    year: year !== null && Number.isFinite(year) ? year : null,
  };
}

export function createProduct(input: ProductInput): ProductSummary {
  const name = input.name?.trim();
  if (!name) throw new RepoError("Укажите название объекта.");
  const norm = normalizeEdition(input);
  const now = nowIso();
  const info = getDb()
    .prepare(
      `INSERT INTO products
        (name, slug, code, collection_id, category, material, dimensions, year, description,
         limited, edition_size, show_edition_count, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      uniqueSlug("products", name),
      uniqueCode("products"),
      input.collection_id ?? null,
      input.category?.trim() || null,
      input.material?.trim() || null,
      input.dimensions?.trim() || null,
      norm.year,
      input.description?.trim() || null,
      norm.limited,
      norm.editionSize,
      norm.showEditionCount,
      input.status ?? "active",
      now,
      now,
    );
  const id = Number(info.lastInsertRowid);
  audit("product.create", "product", id, name);
  return getProduct(id) as ProductSummary;
}

export function updateProduct(id: number, input: ProductInput): ProductSummary {
  const current = getProduct(id);
  if (!current) throw new RepoError("Объект не найден.");
  const name = input.name?.trim() || current.name;
  const norm = normalizeEdition({
    name,
    limited: input.limited === undefined ? current.limited : input.limited,
    edition_size:
      input.edition_size === undefined ? current.edition_size : input.edition_size,
    year: input.year === undefined ? current.year : input.year,
  });

  getDb()
    .prepare(
      `UPDATE products SET
         name = ?, slug = ?, collection_id = ?, category = ?, material = ?, dimensions = ?,
         year = ?, description = ?, limited = ?, edition_size = ?, show_edition_count = ?,
         status = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      name,
      current.name === name ? current.slug : uniqueSlug("products", name, id),
      input.collection_id === undefined ? current.collection_id : input.collection_id ?? null,
      input.category === undefined ? current.category : input.category?.trim() || null,
      input.material === undefined ? current.material : input.material?.trim() || null,
      input.dimensions === undefined ? current.dimensions : input.dimensions?.trim() || null,
      norm.year,
      input.description === undefined
        ? current.description
        : input.description?.trim() || null,
      norm.limited,
      norm.editionSize,
      input.show_edition_count === undefined
        ? current.show_edition_count
        : norm.showEditionCount,
      input.status ?? current.status,
      nowIso(),
      id,
    );
  audit("product.update", "product", id, name);
  return getProduct(id) as ProductSummary;
}

export function deleteProduct(id: number): void {
  getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
  audit("product.delete", "product", id);
}

/* ------------------------------------------------------------ product media */

export function productPhotos(productId: number): MediaRow[] {
  return getDb()
    .prepare(
      `SELECT m.* FROM product_media pm JOIN media m ON m.id = pm.media_id
       WHERE pm.product_id = ? ORDER BY pm.position, pm.media_id`,
    )
    .all(productId) as MediaRow[];
}

export function setProductPhotos(productId: number, mediaIds: number[]): MediaRow[] {
  const db = getDb();
  const clean = mediaIds.filter((mediaId) => Number.isFinite(mediaId));
  const tx = db.transaction((ids: number[]) => {
    db.prepare("DELETE FROM product_media WHERE product_id = ?").run(productId);
    const insert = db.prepare(
      "INSERT OR IGNORE INTO product_media (product_id, media_id, position) VALUES (?, ?, ?)",
    );
    ids.forEach((mediaId, index) => insert.run(productId, mediaId, index));
  });
  tx(clean);
  audit("product.photos", "product", productId, `${clean.length} photo(s)`);
  return productPhotos(productId);
}

/* -------------------------------------------------------------------- pages */

export function pagesForProduct(productId: number): PageRow[] {
  return getDb()
    .prepare("SELECT * FROM pages WHERE product_id = ? ORDER BY serial ASC")
    .all(productId) as PageRow[];
}

const PAGE_SELECT = `
  SELECT pg.*, p.name AS product_name, p.code AS product_code, p.limited AS limited,
         p.edition_size AS edition_size, c.name AS collection_name,
         (SELECT COUNT(*) FROM pages x WHERE x.product_id = pg.product_id) AS product_pages_count,
         (SELECT m.filename FROM product_media pm JOIN media m ON m.id = pm.media_id
            WHERE pm.product_id = pg.product_id ORDER BY pm.position, pm.media_id LIMIT 1) AS cover_filename
  FROM pages pg
  JOIN products p ON p.id = pg.product_id
  LEFT JOIN collections c ON c.id = p.collection_id
`;

function mapPageSummary(row: Record<string, unknown>): PageSummary {
  const limited = Number(row.limited) === 1;
  const editionSize = row.edition_size == null ? null : Number(row.edition_size);
  const productPages = Number(row.product_pages_count ?? 0);
  const { product_pages_count: _unused, ...rest } = row;
  void _unused;
  return {
    ...(rest as unknown as PageRow),
    product_name: String(row.product_name),
    product_code: String(row.product_code),
    collection_name: (row.collection_name as string | null) ?? null,
    limited: limited ? 1 : 0,
    edition_size: editionSize,
    edition_total: limited && editionSize ? editionSize : productPages,
    cover_filename: (row.cover_filename as string | null) ?? null,
  };
}

export function listPages(
  filter: { q?: string; productId?: number; code?: string } = {},
): PageSummary[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter.productId != null) {
    where.push("pg.product_id = ?");
    params.push(filter.productId);
  }
  if (filter.code) {
    where.push("pg.code = ?");
    params.push(filter.code);
  }
  const q = filter.q?.trim();
  if (q) {
    where.push(
      `(pg.code LIKE ? COLLATE NOCASE OR p.name LIKE ? COLLATE NOCASE
        OR IFNULL(pg.label,'') LIKE ? COLLATE NOCASE OR IFNULL(c.name,'') LIKE ? COLLATE NOCASE)`,
    );
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  const rows = getDb()
    .prepare(
      `${PAGE_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY pg.created_at DESC, pg.id DESC`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(mapPageSummary);
}

export function getPage(id: number): PageSummary | null {
  const row = getDb().prepare(`${PAGE_SELECT} WHERE pg.id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapPageSummary(row) : null;
}

export function getPageByCode(code: string): PageSummary | null {
  const row = getDb().prepare(`${PAGE_SELECT} WHERE pg.code = ?`).get(code) as
    | Record<string, unknown>
    | undefined;
  return row ? mapPageSummary(row) : null;
}

export interface PageInput {
  label?: string | null;
  note?: string | null;
  serial?: number | null;
}

/**
 * Creates one generated page = one physical object (one QR passport).
 * Serials are per product, start at 1 and never get reused after deletion.
 */
export function createPage(productId: number, input: PageInput = {}): PageSummary {
  const db = getDb();
  const product = getProduct(productId);
  if (!product) throw new RepoError("Объект не найден.");

  const existing = pagesForProduct(productId);
  let serial: number;
  if (input.serial != null && Number.isFinite(Number(input.serial))) {
    serial = Math.max(1, Math.floor(Number(input.serial)));
    if (existing.some((page) => page.serial === serial)) {
      throw new RepoError(`Номер ${serial} уже занят — выберите другой.`);
    }
  } else {
    serial = existing.reduce((max, page) => Math.max(max, page.serial), 0) + 1;
  }

  if (Number(product.limited) === 1 && product.edition_size && serial > product.edition_size) {
    throw new RepoError(
      `Тираж лимитированного объекта — ${product.edition_size}. Номер ${serial} вне тиража.`,
    );
  }

  const info = db
    .prepare(
      `INSERT INTO pages (product_id, serial, code, label, note, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
    )
    .run(
      productId,
      serial,
      uniqueCode("pages"),
      input.label?.trim() || null,
      input.note?.trim() || null,
      nowIso(),
    );
  audit("page.create", "page", Number(info.lastInsertRowid), `${product.name} #${serial}`);
  return getPage(Number(info.lastInsertRowid)) as PageSummary;
}

export function updatePage(id: number, input: PageInput & { status?: string }): PageSummary {
  const current = getPage(id);
  if (!current) throw new RepoError("Страница не найдена.");
  const status =
    input.status === "void" ? "void" : input.status === "active" ? "active" : current.status;
  getDb()
    .prepare("UPDATE pages SET label = ?, note = ?, status = ? WHERE id = ?")
    .run(
      input.label === undefined ? current.label : input.label?.trim() || null,
      input.note === undefined ? current.note : input.note?.trim() || null,
      status,
      id,
    );
  audit("page.update", "page", id);
  return getPage(id) as PageSummary;
}

export function deletePage(id: number): void {
  getDb().prepare("DELETE FROM pages WHERE id = ?").run(id);
  audit("page.delete", "page", id);
}

/* ------------------------------------------------------------------- public */

export interface PublicObject {
  code: string;
  serial: number;
  pageLabel: string | null;
  productName: string;
  productCode: string;
  category: string | null;
  material: string | null;
  dimensions: string | null;
  year: number | null;
  description: string | null;
  collectionName: string | null;
  collectionReleaseDate: string | null;
  collectionDescription: string | null;
  limited: boolean;
  editionSize: number | null;
  pagesCount: number;
  showEditionCount: boolean;
  status: string;
  createdAt: string;
  photos: MediaRow[];
}

/** Everything the generated public page needs, in one query round trip. */
export function getPublicObject(code: string): PublicObject | null {
  const page = getPageByCode(code);
  if (!page) return null;
  const product = getDb()
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(page.product_id) as Product | undefined;
  if (!product) return null;
  const collection = product.collection_id
    ? (getDb()
        .prepare("SELECT * FROM collections WHERE id = ?")
        .get(product.collection_id) as Collection | undefined)
    : undefined;
  return {
    code: page.code,
    serial: page.serial,
    pageLabel: page.label,
    productName: product.name,
    productCode: product.code,
    category: product.category,
    material: product.material,
    dimensions: product.dimensions,
    year: product.year,
    description: product.description,
    collectionName: collection?.name ?? null,
    collectionReleaseDate: collection?.release_date ?? null,
    collectionDescription: collection?.description ?? null,
    limited: Number(product.limited) === 1,
    editionSize: product.edition_size,
    pagesCount: page.edition_total,
    showEditionCount: Number(product.show_edition_count) === 1,
    status: page.status,
    createdAt: page.created_at,
    photos: productPhotos(product.id),
  };
}

/* -------------------------------------------------------------------- stats */

export interface Stats {
  collections: number;
  products: number;
  pages: number;
  photos: number;
  limited_products: number;
  pages_7d: number;
}

export function getStats(): Stats {
  const db = getDb();
  const one = (sql: string) => Number((db.prepare(sql).get() as { n: number }).n);
  return {
    collections: one("SELECT COUNT(*) AS n FROM collections"),
    products: one("SELECT COUNT(*) AS n FROM products"),
    pages: one("SELECT COUNT(*) AS n FROM pages"),
    photos: one("SELECT COUNT(*) AS n FROM media"),
    limited_products: one("SELECT COUNT(*) AS n FROM products WHERE limited = 1"),
    pages_7d: one(
      "SELECT COUNT(*) AS n FROM pages WHERE created_at >= datetime('now', '-7 days')",
    ),
  };
}

export interface AuditRow {
  id: number;
  at: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  detail: string | null;
}

export function recentAudit(limit = 12): AuditRow[] {
  return getDb()
    .prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?")
    .all(limit) as AuditRow[];
}
