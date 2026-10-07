"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CollectionSummary } from "@/lib/repo";
import { prepareFile } from "@/lib/clientImage";
import type { MediaRow, ProductSummary } from "@/lib/types";

export default function CollectionEditor({
  collection,
  products,
  cover,
}: {
  collection: CollectionSummary;
  products: ProductSummary[];
  cover: MediaRow | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(collection.name);
  const [release, setRelease] = useState(collection.release_date ?? "");
  const [description, setDescription] = useState(collection.description ?? "");
  const [coverId, setCoverId] = useState<number | null>(collection.cover_media_id);
  const [coverFile, setCoverFile] = useState<MediaRow | null>(cover);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function patch(body: Record<string, unknown>) {
    const response = await fetch(`/api/admin/collections/${collection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Не удалось сохранить.");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await patch({
        name,
        release_date: release || null,
        description: description || null,
        cover_media_id: coverId,
      });
      setMessage({ kind: "ok", text: "Сохранено." });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: (error as Error).message });
    }
    setBusy(false);
  }

  async function uploadCover(files: FileList) {
    const raw = files[0];
    if (!raw) return;
    setBusy(true);
    setMessage(null);
    const prepared = await prepareFile(raw);
    const body = new FormData();
    body.append("file", prepared.file);
    if (prepared.width) body.append("width", String(prepared.width));
    if (prepared.height) body.append("height", String(prepared.height));
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      media?: MediaRow[];
    };
    if (!response.ok || !data.media?.[0]) {
      setMessage({ kind: "error", text: data.error ?? "Не удалось загрузить обложку." });
      setBusy(false);
      return;
    }
    const media = data.media[0];
    setCoverId(media.id);
    setCoverFile(media);
    try {
      await patch({ cover_media_id: media.id });
      setMessage({ kind: "ok", text: "Обложка обновлена." });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: (error as Error).message });
    }
    setBusy(false);
  }

  async function removeCover() {
    setBusy(true);
    setCoverId(null);
    setCoverFile(null);
    try {
      await patch({ cover_media_id: null });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: (error as Error).message });
    }
    setBusy(false);
  }

  return (
    <div>
      <form onSubmit={save} className="grid gap-6 border-b border-line px-6 py-8 md:grid-cols-2 md:px-10">
        <div>
          <label className="label" htmlFor="c-name">
            Название *
          </label>
          <input
            id="c-name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field mt-2"
          />
        </div>
        <div>
          <label className="label" htmlFor="c-release">
            Дата релиза
          </label>
          <input
            id="c-release"
            type="date"
            value={release}
            onChange={(event) => setRelease(event.target.value)}
            className="field mt-2"
          />
          <p className="mt-2 text-[12px] text-muted">
            Используется для сортировки объектов по дате релиза коллекции и выводится на
            сгенерированной странице.
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="c-description">
            Описание
          </label>
          <textarea
            id="c-description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="field mt-2"
          />
        </div>

        <div className="md:col-span-2">
          <p className="label">Обложка коллекции</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="h-24 w-32 border border-line bg-[#f2f2ef]">
              {coverFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/media/${coverFile.filename}`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                {coverFile ? "Заменить" : "Загрузить обложку"}
              </button>
              {coverFile ? (
                <button type="button" className="btn btn-danger" disabled={busy} onClick={removeCover}>
                  Убрать
                </button>
              ) : null}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) void uploadCover(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 md:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={busy || !name}>
            {busy ? "Сохраняем…" : "Сохранить коллекцию"}
          </button>
          {message ? (
            <p className={`text-[13px] ${message.kind === "ok" ? "text-muted" : "text-accent"}`}>
              {message.text}
            </p>
          ) : null}
        </div>
      </form>

      <section className="px-6 py-8 md:px-10">
        <h2 className="mb-4 border-b border-line pb-2 text-[15px] font-medium">
          Объекты коллекции ({products.length})
        </h2>
        {products.length === 0 ? (
          <p className="text-[13px] text-muted">
            Пока пусто. Добавьте объект и выберите эту коллекцию.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {products.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-4 py-3">
                <Link href={`/admin/products/${product.id}`} className="hover:text-accent">
                  {product.name}
                </Link>
                <span className="mono text-[12px] text-muted">
                  {product.pages_count} стр. · {Number(product.limited) === 1 ? `лимит ${product.edition_size}` : "открытая"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
