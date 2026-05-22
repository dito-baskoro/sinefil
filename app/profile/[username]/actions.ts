"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { resolveTmdbIdsToMovieIds } from "@/lib/picker-actions";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function updateProfile(formData: FormData): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };

  const bioRaw = String(formData.get("bio") ?? "");
  const bio = bioRaw.trim();
  if (bio.length > 280) return { error: "Bio maks 280 karakter." };

  const displayNameRaw = String(formData.get("display_name") ?? "");
  const displayName = displayNameRaw.trim();
  if (displayName.length > 50) return { error: "Nama tampilan maks 50 karakter." };

  const locationRaw = String(formData.get("location") ?? "");
  const location = locationRaw.trim();
  if (location.length > 80) return { error: "Lokasi maks 80 karakter." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis." };

  const update: Record<string, unknown> = {
    bio: bio || null,
    display_name: displayName || null,
    location: location || null,
  };

  const avatarFile = formData.get("avatar") as File | null;
  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return { error: "Foto profil maks 2 MB." };
    }
    if (!ALLOWED_AVATAR_TYPES.includes(avatarFile.type)) {
      return { error: "Format foto harus PNG, JPEG, atau WebP." };
    }
    const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/avatar.${ext}`;
    const service = createServiceClient();

    // Clear any previous file (different extension) before writing the new one.
    const { data: existing } = await service.storage.from("avatars").list(user.id);
    if (existing?.length) {
      await service.storage
        .from("avatars")
        .remove(existing.map((f) => `${user.id}/${f.name}`).filter((p) => p !== path));
    }

    const { error: uploadError } = await service.storage
      .from("avatars")
      .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
    if (uploadError) return { error: `Upload gagal: ${uploadError.message}` };

    const { data: pub } = service.storage.from("avatars").getPublicUrl(path);
    // Append a cache-buster so the freshly uploaded image replaces the old one in the browser.
    update.avatar_url = `${pub.publicUrl}?v=${Date.now()}`;
  }

  const { error: updateError } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (updateError) return { error: updateError.message };

  revalidatePath("/", "layout");
  return {};
}

export async function toggleFollow(
  followeeId: string,
  username: string,
): Promise<{ error?: string; following?: boolean }> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Login dulu buat follow." };
  if (user.id === followeeId) return { error: "Gak bisa follow diri sendiri." };

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("followee_id", followeeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followee_id", followeeId);
    if (error) return { error: error.message };
    revalidatePath(`/profile/${username}`);
    return { following: false };
  }

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, followee_id: followeeId });
  if (error) return { error: error.message };
  revalidatePath(`/profile/${username}`);
  return { following: true };
}

export async function setProfileFavorites(
  tmdbIds: number[],
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };
  if (tmdbIds.length > 4) return { error: "Maks 4 film favorit." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis." };

  const movieIds = await resolveTmdbIdsToMovieIds(tmdbIds);

  const { error } = await supabase.rpc("set_profile_favorites", { p_movie_ids: movieIds });
  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.username) revalidatePath(`/profile/${profile.username}`);
  return {};
}

export async function deleteAvatar(): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis." };

  const service = createServiceClient();
  const { data: files } = await service.storage.from("avatars").list(user.id);
  if (files?.length) {
    await service.storage
      .from("avatars")
      .remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}
