"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MovieSearchPicker } from "@/components/movie-search-picker";
import { tmdbImage } from "@/lib/utils";
import {
  addListItem,
  deleteList,
  removeListItem,
  reorderListItems,
  updateList,
} from "../../actions";

type Item = {
  movie_id: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
};

export function ListEditor({
  list,
  initialItems,
}: {
  list: { id: string; title: string; description: string; is_public: boolean };
  initialItems: Item[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description);
  const [isPublic, setIsPublic] = useState(list.is_public);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [savingMeta, startSaveMeta] = useTransition();
  const [adding, startAdd] = useTransition();
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function saveMeta() {
    setError(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    if (isPublic) fd.set("is_public", "true");
    startSaveMeta(async () => {
      const result = await updateList(list.id, fd);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    startBusy(async () => {
      const result = await reorderListItems(list.id, next.map((it) => it.movie_id));
      if (result.error) {
        setError(result.error);
        setItems(items);
      }
    });
  }

  function remove(movieId: number) {
    const prev = items;
    setItems(items.filter((it) => it.movie_id !== movieId));
    startBusy(async () => {
      const result = await removeListItem(list.id, movieId);
      if (result.error) {
        setError(result.error);
        setItems(prev);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold">Edit list</h1>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/lists/${list.id}`}>Lihat</Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (!confirm("Hapus list ini?")) return;
              startBusy(async () => {
                const result = await deleteList(list.id);
                if (result.error) setError(result.error);
              });
            }}
          >
            Hapus list
          </Button>
        </div>
      </header>

      <section className="space-y-3 rounded-md border border-border p-4">
        <div className="space-y-2">
          <Label htmlFor="title">Judul</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Deskripsi</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="is_public" checked={isPublic} onCheckedChange={setIsPublic} />
          <Label htmlFor="is_public">Publik</Label>
        </div>
        <Button onClick={saveMeta} disabled={savingMeta} size="sm">
          {savingMeta ? "Menyimpan..." : "Simpan"}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Film di list ini ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada film. Cari di bawah.</p>
        ) : (
          <ol className="space-y-2">
            {items.map((it, i) => {
              const poster = tmdbImage(it.poster_path, "w185");
              return (
                <li
                  key={it.movie_id}
                  className="flex items-center gap-2 rounded-md border border-border p-2"
                >
                  <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-secondary">
                    {poster && (
                      <Image src={poster} alt="" fill sizes="44px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{it.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.release_date?.slice(0, 4) || "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={busy || i === 0}
                      onClick={() => move(i, -1)}
                      aria-label="Naikkan"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={busy || i === items.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label="Turunkan"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      onClick={() => remove(it.movie_id)}
                      aria-label="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tambah film</h2>
        <MovieSearchPicker
          excludeTmdbIds={items.map((it) => it.tmdb_id)}
          onPick={(m) => {
            startAdd(async () => {
              const result = await addListItem(list.id, m.tmdb_id);
              if (result.error) {
                setError(result.error);
                return;
              }
              if (result.item) {
                setItems((prev) =>
                  prev.some((it) => it.movie_id === result.item!.movie_id)
                    ? prev
                    : [...prev, result.item!],
                );
              }
              router.refresh();
            });
          }}
        />
        {adding && <p className="text-xs text-muted-foreground">Menambahkan...</p>}
      </section>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
