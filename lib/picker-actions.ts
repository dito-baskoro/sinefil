"use server";

import { searchMovies } from "@/lib/tmdb";
import { ensureMovieCached } from "@/lib/movies";

export type PickableMovie = {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
};

export async function searchMoviesForPicker(query: string): Promise<PickableMovie[]> {
  const q = query.trim();
  if (!q) return [];
  const results = await searchMovies(q);
  return results.slice(0, 20).map((m) => ({
    tmdb_id: m.id,
    title: m.title,
    poster_path: m.poster_path,
    release_date: m.release_date,
  }));
}

/** Resolve TMDB ids to local movies.id values, caching as needed. */
export async function resolveTmdbIdsToMovieIds(tmdbIds: number[]): Promise<number[]> {
  const out: number[] = [];
  for (const id of tmdbIds) {
    const { row } = await ensureMovieCached(id);
    if (row) out.push(row.id);
  }
  return out;
}
