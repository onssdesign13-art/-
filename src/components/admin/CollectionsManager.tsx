"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CollectionSummary } from "@/lib/repo";
import { formatDate } from "@/lib/i18n";

export default function CollectionsManager({
  collections,
}: {
  collections: CollectionSummary[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [release, setRelease] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/admin/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        release_date: release || null,
        description: description || null,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      collection?: { id: number };
    };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Не удалось создать коллекцию.");
      return;
    }
    setName("");
    setRelease("");
    setDescription("");
    router.refresh();
  }

  async function remove(collection: CollectionSummary) {
    const confirmed = window.confirm(
      `Удалить коллекцию «${collection.name}»? Объекты останутся, но потеряют привязку к коллекции.`,
    );
    if (!confirmed) return;
    setBusyId(collection.id);
    const response = await fetch(`/api/admin/collections/${collection.id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Не удалось удалить коллекцию.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={create} className="border-b border-line px-6 py-6 md:px-10">
        <h2 className="text-[15px] font-medium">Новая коллекция</h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <label className="label" htmlFor="collection-name">
              Название *
            </label>
            <input
              id="collection-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например: TERRA"
              className="field mt-2"
            />
          </div>
          <div className="w-[190px]">
            <label className="label" htmlFor="collection-release">
              Дата релиза
            </label>
            <input
              id="collection-release"
              type="date"
              value={release}
              onChange={(event) => setRelease(event.target.value)}
              className="field mt-2"
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="label" htmlFor="collection-description">
              Описание
            </label>
            <input
              id="collection-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="field mt-2"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || !name}>
            {busy ? "Создаём…" : "Добавить коллекцию"}
          </button>
        </div>
        {error ? <p className="mt-3 text-[13px] text-accent">{error}</p> : null}
      </form>

      {collections.length === 0 ? (
        <p className="px-6 py-10 text-[13px] text-muted md:px-10">
          Коллекций пока нет. Создайте первую — объекты группируются по коллекциям, а на
          сгенерированной странице выводится название коллекции и дата релиза.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                <th className="th pl-6 md:pl-10">Обложка</th>
                <th className="th">Коллекция</th>
                <th className="th">Релиз</th>
                <th className="th">Объектов</th>
                <th className="th">Страниц</th>
                <th className="th pr-6 text-right md:pr-10">Действия</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => (
                <tr key={collection.id}>
                  <td className="td pl-6 md:pl-10">
                    <div className="h-12 w-16 border border-line bg-[#f2f2ef]">
                      {collection.cover_filename ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/media/${collection.cover_filename}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="td">
                    <Link
                      href={`/admin/collections/${collection.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {collection.name}
                    </Link>
                    {collection.description ? (
                      <p className="mt-1 max-w-[46ch] truncate text-[12px] text-muted">
                        {collection.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="td mono text-[12px]">
                    {collection.release_date ? formatDate(collection.release_date) : "—"}
                  </td>
                  <td className="td mono text-[14px]">{collection.products_count}</td>
                  <td className="td mono text-[14px]">{collection.pages_count}</td>
                  <td className="td pr-6 text-right md:pr-10">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/collections/${collection.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Открыть
                      </Link>
                      <Link
                        href={`/admin/products?collection=${collection.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Объекты
                      </Link>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busyId === collection.id}
                        onClick={() => remove(collection)}
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
    </div>
  );
}
