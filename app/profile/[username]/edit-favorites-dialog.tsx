"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MovieSearchPicker } from "@/components/movie-search-picker";
import { tmdbImage } from "@/lib/utils";
import type { PickableMovie } from "@/lib/picker-actions";
import { setProfileFavorites } from "./actions";

const MAX = 4;

export function EditFavoritesDialog({
  initialFavorites,
}: {
  initialFavorites: PickableMovie[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<PickableMovie[]>(initialFavorites);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPicks(initialFavorites);
    setError(null);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= picks.length) return;
    const next = [...picks];
    [next[i], next[j]] = [next[j], next[i]];
    setPicks(next);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit favorit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pilih 4 film favorit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {picks.length > 0 ? (
            <ol className="space-y-2">
              {picks.map((m, i) => {
                const poster = tmdbImage(m.poster_path, "w185");
                return (
                  <li
                    key={m.tmdb_id}
                    className="flex items-center gap-2 rounded-md border border-border p-2"
                  >
                    <span className="w-5 text-center text-sm font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-secondary">
                      {poster && (
                        <Image src={poster} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.release_date?.slice(0, 4) || "—"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label="Naikkan"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={i === picks.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label="Turunkan"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setPicks(picks.filter((_, k) => k !== i))}
                        aria-label="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada favorit. Cari di bawah.</p>
          )}

          {picks.length < MAX && (
            <MovieSearchPicker
              onPick={(m) => {
                if (picks.length >= MAX) return;
                if (picks.some((p) => p.tmdb_id === m.tmdb_id)) return;
                setPicks([...picks, m]);
              }}
              excludeTmdbIds={picks.map((p) => p.tmdb_id)}
            />
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await setProfileFavorites(picks.map((p) => p.tmdb_id));
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
