"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import QrDialog, { type QrTarget } from "./QrDialog";
import type { PageRow } from "@/lib/types";
import { formatDate } from "@/lib/i18n";

export interface EditorPage extends PageRow {
  url: string;
}

export default function PagesManager({
  productId,
  productName,
  limited,
  editionSize,
  showEditionCount,
  initialPages,
  baseUrl,
}: {
  productId: number;
  productName: string;
  limited: boolean;
  editionSize: number | null;
  showEditionCount: boolean;
  initialPages: EditorPage[];
  baseUrl: string;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<EditorPage[]>(initialPages);
  const [count, setCount] = useState("1");
  const [serial, setSerial] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrPage, setQrPage] = useState<QrTarget | null>(null);

  const withUrl = (page: PageRow): EditorPage => ({ ...page, url: `${baseUrl}/o/${page.code}` });
  const previewTotal = limited && editionSize ? editionSize : pages.length;

  function preview(serialNumber: number) {
    const n = String(serialNumber).padStart(2, "0");
    if (limited && editionSize) return `${n} / ${editionSize}`;
    if (showEditionCount && pages.length > 0) return `${n} / ${previewTotal}`;
    return `№ ${n}`;
  }

  async function addPages() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/products/${productId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        count: Number(count) || 1,
        serial: serial ? Number(serial) : null,
        label: label || null,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      pages?: PageRow[];
    };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Не удалось добавить страницы.");
      return;
    }
    const created = (data.pages ?? []).map(withUrl);
    setPages((prev) => [...prev, ...created].sort((a, b) => a.serial - b.serial));
    setSerial("");
    setLabel("");
    router.refresh();
  }

  async function removePage(page: EditorPage) {
    const confirmed = window.confirm(
      `Удалить страницу № ${page.serial} (${page.code})? QR-код и ссылка перестанут работать.`,
    );
    if (!confirmed) return;
    setBusy(true);
    const response = await fetch(`/api/admin/pages/${page.id}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Не удалось удалить страницу.");
      return;
    }
    setPages((prev) => prev.filter((item) => item.id !== page.id));
    router.refresh();
  }

  async function toggleVoid(page: EditorPage) {
    const nextStatus = page.status === "void" ? "active" : "void";
    setBusy(true);
    const response = await fetch(`/api/admin/pages/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Не удалось изменить статус.");
      return;
    }
    setPages((prev) =>
      prev.map((item) => (item.id === page.id ? { ...item, status: nextStatus } : item)),
    );
    router.refresh();
  }

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="grid gap-6 border-b border-line pb-8 md:grid-cols-[1fr_auto]">
        <div>
          <h2 className="text-[18px] font-medium">Страницы объекта</h2>
          <p className="mt-2 max-w-[70ch] text-[13px] text-muted">
            Одна страница = один физический экземпляр = один QR-код на паспорте.
            {limited && editionSize
              ? ` Объект лимитированный: тираж ${editionSize}, номер на странице отображается как «03 / ${editionSize}».`
              : showEditionCount
                ? " Объект открытой серии: знаменатель на странице — текущее количество созданных страниц."
                : " На странице показывается только номер экземпляра."}
          </p>
        </div>
        <div className="text-right">
          <p className="label">Создано страниц</p>
          <p className="mono text-[34px] leading-none">{pages.length}</p>
          <p className="label mt-2">
            {preview(pages.length > 0 ? pages[pages.length - 1].serial : 1)}
          </p>
        </div>
      </div>

      <div className="border-b border-line py-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-[110px]">
            <label className="label" htmlFor="page-count">
              Сколько
            </label>
            <input
              id="page-count"
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className="field mt-2"
            />
          </div>
          <div className="w-[150px]">
            <label className="label" htmlFor="page-serial">
              Номер (опц.)
            </label>
            <input
              id="page-serial"
              type="number"
              min={1}
              value={serial}
              onChange={(event) => setSerial(event.target.value)}
              placeholder="авто"
              className="field mt-2"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="label" htmlFor="page-label">
              Метка (опц.)
            </label>
            <input
              id="page-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Например: шоурум / заказ № 12"
              className="field mt-2"
            />
          </div>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={addPages}>
            {busy ? "Добавляем…" : "+ Добавить страницу"}
          </button>
        </div>
        {error ? <p className="mt-4 text-[13px] text-accent">{error}</p> : null}
      </div>

      {pages.length === 0 ? (
        <p className="py-8 text-[13px] text-muted">
          Страниц ещё нет. Добавьте нужное количество — каждая получит собственную ссылку и QR-код.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className="th">№</th>
                <th className="th">На странице</th>
                <th className="th">Ссылка</th>
                <th className="th">Метка</th>
                <th className="th">Создана</th>
                <th className="th text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td className="td mono text-[15px]">
                    {String(page.serial).padStart(2, "0")}
                    {page.status === "void" ? (
                      <span className="label ml-2 text-accent">аннулирована</span>
                    ) : null}
                  </td>
                  <td className="td mono text-[13px]">
                    {limited && editionSize
                      ? `${String(page.serial).padStart(2, "0")} / ${editionSize}`
                      : showEditionCount
                        ? `${String(page.serial).padStart(2, "0")} / ${previewTotal}`
                        : `№ ${String(page.serial).padStart(2, "0")}`}
                  </td>
                  <td className="td">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mono text-[12px] hover:text-accent"
                    >
                      /o/{page.code} ↗
                    </a>
                  </td>
                  <td className="td text-[13px] text-muted">{page.label ?? "—"}</td>
                  <td className="td mono text-[12px] text-muted">{formatDate(page.created_at)}</td>
                  <td className="td text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                          setQrPage({
                            id: page.id,
                            serial: page.serial,
                            code: page.code,
                            url: page.url,
                            productName,
                          })
                        }
                      >
                        QR-код
                      </button>
                      <a
                        className="btn btn-ghost btn-sm"
                        href={`/print/${page.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Печать
                      </a>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => toggleVoid(page)}
                      >
                        {page.status === "void" ? "Вернуть" : "Аннулировать"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busy}
                        onClick={() => removePage(page)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qrPage ? <QrDialog page={qrPage} onClose={() => setQrPage(null)} /> : null}
    </div>
  );
}
