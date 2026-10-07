"use client";

import { useState } from "react";

export interface QrTarget {
  id: number;
  serial: number;
  code: string;
  url: string;
  productName?: string;
}

export default function QrDialog({
  page,
  onClose,
}: {
  page: QrTarget;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const qr = `/api/admin/pages/${page.id}/qr?size=900&margin=1`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(page.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] border border-ink bg-paper"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="label">QR-код страницы</p>
            <p className="mt-1 text-[15px] font-medium">
              {page.productName ? `${page.productName} · ` : ""}№ {String(page.serial).padStart(2, "0")}
            </p>
          </div>
          <button type="button" className="label hover:text-ink" onClick={onClose}>
            Закрыть ✕
          </button>
        </header>

        <div className="grid gap-5 p-5 sm:grid-cols-[220px_1fr]">
          <div className="border border-line p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR ${page.code}`} className="w-full" />
          </div>
          <div className="min-w-0">
            <p className="label">Адрес</p>
            <p className="mono mt-1 break-all text-[12px]">{page.url}</p>
            <p className="label mt-4">Код объекта</p>
            <p className="mono mt-1 text-[15px] tracking-[0.2em]">{page.code}</p>
            <button type="button" className="btn btn-ghost btn-sm mt-5 w-full" onClick={copy}>
              {copied ? "Скопировано" : "Копировать ссылку"}
            </button>
          </div>
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
          <a className="btn btn-primary btn-sm" href={`${qr}&download=1&format=png`}>
            Скачать PNG
          </a>
          <a className="btn btn-ghost btn-sm" href={`${qr}&download=1&format=svg`}>
            Скачать SVG
          </a>
          <a className="btn btn-ghost btn-sm" href={`/print/${page.id}`} target="_blank" rel="noreferrer">
            Печать паспорта
          </a>
          <a className="btn btn-ghost btn-sm" href={page.url} target="_blank" rel="noreferrer">
            Открыть страницу ↗
          </a>
        </footer>
      </div>
    </div>
  );
}
