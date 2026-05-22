"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { resolveTmdbIdsToMovieIds } from "@/lib/picker-actions";

type Result<T extends object = object> = { error?: string } & Partial<T>;

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createList(formData: FormData): Promise<Result<{ id: string }>> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };
  const { supabase, user } = await getUser();
  if (!user) return { error: "Login dulu." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isPublic = formData.get("is_public") === "on" || formData.get("is_public") === "true";

  if (!title) return { error: "Judul wajib diisi." };
  if (title.length > 120) return { error: "Judul maks 120 karakter." };
  if (description.length > 2000) return { error: "Deskripsi maks 2000 karakter." };

  const { data, error } = await supabase
    .from("lists")
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      is_public: isPublic,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Gagal membuat list." };
  revalidatePath("/lists");
  redirect(`/lists/${data.id}/edit`);
}

export async function updateList(
  listId: string,
  formData: FormData,
): Promise<Result> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };
  const { supabase, user } = await getUser();
  if (!user) return { error: "Login dulu." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isPublic = formData.get("is_public") === "on" || formData.get("is_public") === "true";

  if (!title) return { error: "Judul wajib diisi." };
  if (title.length > 120) return { error: "Judul maks 120 karakter." };
  if (description.length > 2000) return { error: "Deskripsi maks 2000 karakter." };

  const { error } = await supabase
    .from("lists")
    .update({ title, description: description || null, is_public: isPublic })
    .eq("id", listId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/lists/${listId}`);
  revalidatePath(`/lists/${listId}/edit`);
  return {};
}

export async function deleteList(listId: string): Promise<Result> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };
  const { supabase, user } = await getUser();
  if (!user) return { error: "Login dulu." };

  const { error } = await supabase.from("lists").delete().eq("id", listId).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/lists");
  redirect("/lists");
}

export async function addListItem(
  listId: string,
  tmdbId: number,
): Promise<Result<{ item: { movie_id: number; tmdb_id: number; title: string; poster_path: string | null; release_date: string } }>> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };
  const { supabase, user } = await getUser();
  if (!user) return { error: "Login dulu." };

  const { data: list } = await supabase
    .from("lists")
    .select("user_id")
    .eq("id", listId)
    .maybeSingle();
  if (!list || list.user_id !== user.id) return { error: "List bukan punyamu." };

  const [movieId] = await resolveTmdbIdsToMovieIds([tmdbId]);
  if (!movieId) return { error: "Film tidak ditemukan di TMDB." };

  const { data: existing } = await supabase
    .from("list_items")
    .select("movie_id")
    .eq("list_id", listId)
    .eq("movie_id", movieId)
    .maybeSingle();
  if (existing) return {};

  const { data: maxRow } = await supabase
    .from("list_items")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPos = ((maxRow?.position as number | undefined) ?? 0) + 1;

  const { error } = await supabase
    .from("list_items")
    .insert({ list_id: listId, movie_id: movieId, position: nextPos });
  if (error) return { error: error.message };

  const { data: movie } = await supabase
    .from("movies")
    .select("id, tmdb_id, title, poster_path, release_date")
    .eq("id", movieId)
    .maybeSingle();

  revalidatePath(`/lists/${listId}`);
  revalidatePath(`/lists/${listId}/edit`);
  return movie
    ? {
        item: {
          movie_id: movie.id as number,
          tmdb_id: movie.tmdb_id as number,
          title: movie.title as string,
          poster_path: (movie.poster_path as string | null) ?? null,
          release_date: (movie.release_date as string | null) ?? "",
        },
      }
    : {};
}

export async function removeListItem(
  listId: string,
  movieId: number,
): Promise<Result> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };
  const { supabase, user } = await getUser();
  if (!user) return { error: "Login dulu." };

  const { data: list } = await supabase
    .from("lists")
    .select("user_id")
    .eq("id", listId)
    .maybeSingle();
  if (!list || list.user_id !== user.id) return { error: "List bukan punyamu." };

  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("list_id", listId)
    .eq("movie_id", movieId);
  if (error) return { error: error.message };

  revalidatePath(`/lists/${listId}`);
  revalidatePath(`/lists/${listId}/edit`);
  return {};
}

export async function reorderListItems(
  listId: string,
  orderedMovieIds: number[],
): Promise<Result> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };
  const { supabase, user } = await getUser();
  if (!user) return { error: "Login dulu." };

  const { data: list } = await supabase
    .from("lists")
    .select("user_id")
    .eq("id", listId)
    .maybeSingle();
  if (!list || list.user_id !== user.id) return { error: "List bukan punyamu." };

  // Unique deferrable on (list_id, position) lets us reuse positions in one tx.
  // supabase-js doesn't expose tx — write sequentially using large offset trick.
  const offset = 1_000_000;
  for (let i = 0; i < orderedMovieIds.length; i += 1) {
    const { error } = await supabase
      .from("list_items")
      .update({ position: offset + i })
      .eq("list_id", listId)
      .eq("movie_id", orderedMovieIds[i]);
    if (error) return { error: error.message };
  }
  for (let i = 0; i < orderedMovieIds.length; i += 1) {
    const { error } = await supabase
      .from("list_items")
      .update({ position: i + 1 })
      .eq("list_id", listId)
      .eq("movie_id", orderedMovieIds[i]);
    if (error) return { error: error.message };
  }

  revalidatePath(`/lists/${listId}`);
  revalidatePath(`/lists/${listId}/edit`);
  return {};
}
