"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { prepareFile } from "@/lib/clientImage";
import type { MediaRow } from "@/lib/types";

export default function PhotoManager({
  productId,
  photos,
}: {
  productId: number;
  photos: MediaRow[];
}) {
  const router = useRouter();
  const [list, setList] = useState<MediaRow[]>(photos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function persist(next: MediaRow[]) {
    setList(next);
    const response = await fetch(`/api/admin/products/${productId}/photos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaIds: next.map((photo) => photo.id) }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Не удалось сохранить порядок фотографий.");
      return;
    }
    const data = (await response.json()) as { photos: MediaRow[] };
    setList(data.photos);
    router.refresh();
  }

  async function upload(files: FileList | File[]) {
    const all = Array.from(files);
    if (all.length === 0) return;
    setBusy(true);
    setError(null);
    const uploaded: MediaRow[] = [];
    for (const raw of all) {
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
      if (!response.ok || !data.media) {
        setError(data.error ?? `Не удалось загрузить ${raw.name}.`);
        continue;
      }
      uploaded.push(...data.media);
    }
    setBusy(false);
    if (uploaded.length > 0) await persist([...list, ...uploaded]);
  }

  async function remove(photo: MediaRow) {
    if (!window.confirm("Удалить фотографию?")) return;
    setBusy(true);
    const response = await fetch(`/api/admin/media/${photo.id}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Не удалось удалить фотографию.");
      return;
    }
    setList((prev) => prev.filter((item) => item.id !== photo.id));
    router.refresh();
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    void persist(next);
  }

  return (
    <div className="px-6 py-8 md:px-10">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void upload(event.dataTransfer.files);
        }}
        className={`border border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-accent bg-[#fdf4f1]" : "border-line"
        }`}
      >
        <p className="text-[14px]">Перетащите фотографии сюда</p>
        <p className="mt-1 text-[12px] text-muted">
          JPG, PNG, WEBP, AVIF до 20 МБ. Файлы автоматически уменьшаются до 2000 px по длинной стороне.
        </p>
        <button
          type="button"
          className="btn btn-ghost mt-5"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Загружаем…" : "Выбрать файлы"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void upload(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {error ? <p className="mt-4 text-[13px] text-accent">{error}</p> : null}

      {list.length === 0 ? (
        <p className="mt-6 text-[13px] text-muted">
          Фотографий пока нет. Первая фотография из списка становится главной на странице объекта.
        </p>
      ) : (
        <>
          <p className="label mt-8">
            {list.length} фото · первая — главная. Порядок меняется стрелками.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-4">
            {list.map((photo, index) => (
              <li key={photo.id} className="bg-paper p-3">
                <div className="relative aspect-square border border-line bg-[#f2f2ef]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/media/${photo.filename}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {index === 0 ? (
                    <span className="absolute left-0 top-0 bg-ink px-2 py-1 text-2xs uppercase tracking-label text-white">
                      Главная
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={index === 0 || busy}
                      onClick={() => move(index, -1)}
                      aria-label="Левее"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={index === list.length - 1 || busy}
                      onClick={() => move(index, 1)}
                      aria-label="Правее"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={busy}
                    onClick={() => remove(photo)}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
