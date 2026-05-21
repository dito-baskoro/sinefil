import { getMovie, type TmdbMovieDetail } from "@/lib/tmdb";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import type { Movie } from "@/lib/types";

/**
 * Lazily cache a TMDB movie in the local `movies` table.
 * Returns the cached row (with `id` for FK), or null when Supabase isn't configured.
 *
 * Idempotent on `tmdb_id`. Re-syncs at most once per 7 days unless `force` is true.
 */
export async function ensureMovieCached(
  tmdbId: number,
  opts: { force?: boolean } = {}
): Promise<{ row: Movie | null; detail: TmdbMovieDetail | null }> {
  const detail = await getMovie(tmdbId);
  if (!detail) return { row: null, detail: null };

  if (!isSupabaseConfigured()) {
    return { row: null, detail };
  }

  const service = await createServiceClient();
  const { data: existing } = await service
    .from("movies")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const isStale =
    !existing || opts.force || Date.now() - new Date(existing.synced_at).getTime() > sevenDays;

  if (!isStale && existing) return { row: existing as Movie, detail };

  const payload = {
    tmdb_id: detail.id,
    title: detail.title,
    original_title: detail.original_title,
    overview: detail.overview,
    poster_path: detail.poster_path,
    backdrop_path: detail.backdrop_path,
    release_date: detail.release_date || null,
    runtime: detail.runtime,
    genres: detail.genres?.map((g) => g.name) ?? [],
    language: detail.original_language,
    synced_at: new Date().toISOString(),
  };

  const { data: upserted, error } = await service
    .from("movies")
    .upsert(payload, { onConflict: "tmdb_id" })
    .select()
    .single();

  if (error) {
    console.error("[movies] upsert failed", tmdbId, error);
    return { row: (existing as Movie) ?? null, detail };
  }

  return { row: upserted as Movie, detail };
}
