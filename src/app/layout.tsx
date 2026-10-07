import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Objet — passport system",
  description:
    "Админ-панель и генератор страниц-паспортов для коллекционных объектов дизайна.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
