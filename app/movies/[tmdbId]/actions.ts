"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { FamilyMetricsValue } from "@/components/family-metrics-sliders";
import type { WatchlistStatus } from "@/lib/types";

export async function submitReview(input: {
  movieDbId: number;
  rating: number;
  reviewText: string;
  containsSpoiler: boolean;
  family: FamilyMetricsValue;
  vibeTagIds: number[];
}): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };

  const { movieDbId, rating, reviewText, containsSpoiler, family, vibeTagIds } = input;
  if (rating < 0.5 || rating > 5 || rating * 2 !== Math.floor(rating * 2)) {
    return { error: "Rating tidak valid." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Login ulang." };

  const { error } = await supabase.rpc("upsert_review", {
    p_movie_id: movieDbId,
    p_rating: rating,
    p_review_text: reviewText ?? null,
    p_contains_spoiler: containsSpoiler,
    p_family: Object.keys(family).length ? family : null,
    p_vibe_tag_ids: vibeTagIds,
  });

  if (error) return { error: error.message };

  revalidatePath(`/movies/${movieDbId}`);
  revalidatePath("/");
  return {};
}

export async function toggleWatchlist(input: {
  movieDbId: number;
  desiredStatus: WatchlistStatus | null; // null = remove
}): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Login ulang." };

  if (input.desiredStatus === null) {
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("movie_id", input.movieDbId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("watchlist")
      .upsert(
        { user_id: user.id, movie_id: input.movieDbId, status: input.desiredStatus },
        { onConflict: "user_id,movie_id" }
      );
    if (error) return { error: error.message };
  }

  revalidatePath(`/movies/${input.movieDbId}`);
  return {};
}
