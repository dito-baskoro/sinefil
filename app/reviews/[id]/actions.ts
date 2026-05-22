"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { ReactionKind } from "@/lib/types";

const REACTION_KINDS: ReactionKind[] = ["ngakak", "relatable", "ngadi_ngadi", "gas", "bosen"];

export async function toggleReaction(
  reviewId: string,
  kind: ReactionKind,
): Promise<{ error?: string; active?: boolean }> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };
  if (!REACTION_KINDS.includes(kind)) return { error: "Reaksi gak valid." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Login dulu." };

  const { data: existing } = await supabase
    .from("review_reactions")
    .select("review_id")
    .eq("review_id", reviewId)
    .eq("user_id", user.id)
    .eq("kind", kind)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("review_reactions")
      .delete()
      .eq("review_id", reviewId)
      .eq("user_id", user.id)
      .eq("kind", kind);
    if (error) return { error: error.message };
    revalidatePath(`/reviews/${reviewId}`);
    return { active: false };
  }

  const { error } = await supabase
    .from("review_reactions")
    .insert({ review_id: reviewId, user_id: user.id, kind });
  if (error) return { error: error.message };
  revalidatePath(`/reviews/${reviewId}`);
  return { active: true };
}

export async function addComment(
  reviewId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Komentar kosong." };
  if (body.length > 2000) return { error: "Komentar maks 2000 karakter." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Login dulu." };

  const { error } = await supabase
    .from("review_comments")
    .insert({ review_id: reviewId, user_id: user.id, body });
  if (error) return { error: error.message };

  revalidatePath(`/reviews/${reviewId}`);
  return {};
}

export async function deleteComment(
  commentId: string,
  reviewId: string,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Login dulu." };

  const { error } = await supabase
    .from("review_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/reviews/${reviewId}`);
  return {};
}
