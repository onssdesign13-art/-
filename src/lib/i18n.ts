import type { BrandSettings } from "./types";

export interface PublicStrings {
  passport: string;
  object: string;
  collection: string;
  released: string;
  material: string;
  dimensions: string;
  year: string;
  category: string;
  serial: string;
  edition: string;
  limited: string;
  openEdition: string;
  code: string;
  verified: string;
  verifiedText: string;
  voided: string;
  voidedText: string;
  notFound: string;
  notFoundText: string;
  home: string;
  issued: string;
  photos: string;
}

const ru: PublicStrings = {
  passport: "Паспорт объекта",
  object: "Объект",
  collection: "Коллекция",
  released: "Релиз",
  material: "Материал",
  dimensions: "Размеры",
  year: "Год",
  category: "Тип",
  serial: "Номер",
  edition: "Тираж",
  limited: "Лимитированная серия",
  openEdition: "Открытая серия",
  code: "Код",
  verified: "Подлинность подтверждена",
  verifiedText: "Каждый объект маркируется индивидуальным кодом и уникальной страницей.",
  voided: "Страница аннулирована",
  voidedText: "Этот экземпляр больше не обслуживается. Свяжитесь с ателье.",
  notFound: "Объект не найден",
  notFoundText: "Проверьте код или отсканируйте QR-код с паспорта изделия ещё раз.",
  home: "На главную",
  issued: "Выпущено",
  photos: "Фото",
};

const en: PublicStrings = {
  passport: "Object passport",
  object: "Object",
  collection: "Collection",
  released: "Released",
  material: "Material",
  dimensions: "Dimensions",
  year: "Year",
  category: "Type",
  serial: "Number",
  edition: "Edition",
  limited: "Limited edition",
  openEdition: "Open edition",
  code: "Code",
  verified: "Authenticity confirmed",
  verifiedText: "Every object carries a unique code and its own permanent page.",
  voided: "Page revoked",
  voidedText: "This item is no longer serviced. Please contact the atelier.",
  notFound: "Object not found",
  notFoundText: "Check the code or scan the QR on the object passport again.",
  home: "Home",
  issued: "Issued",
  photos: "Photos",
};

export function publicStrings(settings: Pick<BrandSettings, "language">): PublicStrings {
  return settings.language === "en" ? en : ru;
}

export function formatRelease(value: string | null, language: "ru" | "en"): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const monthsRu = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  if (language === "en") {
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  }
  return `${date.getDate()} ${monthsRu[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
