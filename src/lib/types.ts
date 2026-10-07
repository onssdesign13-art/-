export type ProductStatus = "draft" | "active" | "archived";
export type PageStatus = "active" | "void";

export interface MediaRow {
  id: number;
  filename: string;
  original_name: string | null;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  release_date: string | null;
  description: string | null;
  cover_media_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  code: string;
  collection_id: number | null;
  category: string | null;
  material: string | null;
  dimensions: string | null;
  year: number | null;
  description: string | null;
  limited: number;
  edition_size: number | null;
  show_edition_count: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface PageRow {
  id: number;
  product_id: number;
  serial: number;
  code: string;
  label: string | null;
  note: string | null;
  status: PageStatus;
  created_at: string;
}

/** Product joined with everything the admin list needs. */
export interface ProductSummary extends Product {
  collection_name: string | null;
  collection_release_date: string | null;
  pages_count: number;
  cover_media_id: number | null;
  cover_filename: string | null;
  photos_count: number;
}

export interface PageSummary extends PageRow {
  product_name: string;
  product_code: string;
  collection_name: string | null;
  limited: number;
  edition_size: number | null;
  edition_total: number;
  cover_filename: string | null;
}

export interface BrandSettings {
  brand_name: string;
  tagline: string;
  accent: string;
  language: "ru" | "en";
  base_url: string;
  certificate_title: string;
  footer_note: string;
  contact: string;
}

export const DEFAULT_SETTINGS: BrandSettings = {
  brand_name: process.env.BRAND_NAME?.trim() || "OBJET",
  tagline: "Objects of decorative design",
  accent: "#D93A16",
  language: "ru",
  base_url: process.env.BASE_URL?.trim() || "http://localhost:3000",
  certificate_title: "Паспорт объекта",
  footer_note: "Ручная работа — небольшие отличия неизбежны.",
  contact: "",
};

export const CATEGORIES = [
  "Ваза",
  "Лампа",
  "Светильник",
  "Скульптура",
  "Подсвечник",
  "Столик",
  "Зеркало",
  "Объект",
  "Другое",
] as const;

/**
 * Human readable edition label for a single physical object.
 * - limited edition  -> "03 / 100" (fixed edition size from the settings)
 * - open edition     -> "03 / 12"  (12 = how many pages exist for the object)
 * - neither          -> "No. 03"
 */
export function editionLabel(opts: {
  serial: number;
  limited: boolean;
  editionSize: number | null;
  pagesCount: number;
  showEditionCount: boolean;
}): string {
  const n = String(opts.serial).padStart(2, "0");
  if (opts.limited && opts.editionSize && opts.editionSize > 0) {
    return `${n} / ${opts.editionSize}`;
  }
  if (opts.showEditionCount && opts.pagesCount > 0) {
    return `${n} / ${opts.pagesCount}`;
  }
  return `№ ${n}`;
}
