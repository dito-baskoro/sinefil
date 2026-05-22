"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { tmdbImage } from "@/lib/utils";
import { searchMoviesForPicker, type PickableMovie } from "@/lib/picker-actions";

export function MovieSearchPicker({
  onPick,
  excludeTmdbIds = [],
  placeholder = "Cari judul film...",
}: {
  onPick: (movie: PickableMovie) => void;
  excludeTmdbIds?: number[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickableMovie[]>([]);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const excluded = new Set(excludeTmdbIds);

  return (
    <div className="space-y-3">
      <form
        className="flex items-stretch gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          if (!q) return;
          startSearch(async () => {
            const rs = await searchMoviesForPicker(q);
            setResults(rs);
            setLastQuery(q);
          });
        }}
      >
        <label className="flex flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="border-0 bg-transparent p-0 focus-visible:ring-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setLastQuery(null);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <Button type="submit" size="sm" className="h-auto" disabled={searching || !query.trim()}>
          {searching ? "..." : "Cari"}
        </Button>
      </form>

      {results.length > 0 && (
        <ul className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border p-2">
          {results.map((m) => {
            const isExcluded = excluded.has(m.tmdb_id);
            const poster = tmdbImage(m.poster_path, "w185");
            return (
              <li key={m.tmdb_id}>
                <button
                  type="button"
                  disabled={isExcluded}
                  onClick={() => onPick(m)}
                  className="flex w-full items-center gap-2 rounded-md border border-border p-2 text-left text-xs hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-secondary">
                    {poster && (
                      <Image src={poster} alt="" fill sizes="40px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium">{m.title}</p>
                    <p className="text-muted-foreground">
                      {m.release_date?.slice(0, 4) || "—"}
                    </p>
                    {isExcluded && (
                      <p className="text-[10px] text-muted-foreground">sudah dipilih</p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!searching && lastQuery && results.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          Gak ketemu film yang cocok buat &ldquo;{lastQuery}&rdquo;. Coba kata kunci lain.
        </p>
      )}
    </div>
  );
}
