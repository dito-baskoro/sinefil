"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function completeOnboarding(formData: FormData): Promise<{ error?: string }> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim() || null;
  const avatarFile = formData.get("avatar") as File | null;

  if (!USERNAME_RE.test(username)) {
    return { error: "Username harus 3–20 karakter, huruf kecil/angka/underscore." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis. Silakan login ulang." };

  // Username uniqueness check
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (existing) {
    return { error: "Username sudah dipakai." };
  }

  let avatarUrl: string | null = null;
  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 2 * 1024 * 1024) {
      return { error: "Foto profil maks 2 MB." };
    }
    const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const service = await createServiceClient();
    const { error: uploadError } = await service.storage
      .from("avatars")
      .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
    if (uploadError) {
      return { error: `Upload gagal: ${uploadError.message}` };
    }
    const { data: pub } = service.storage.from("avatars").getPublicUrl(path);
    avatarUrl = pub.publicUrl;
  }

  const update: Record<string, unknown> = { username };
  if (displayName) update.display_name = displayName;
  if (avatarUrl) update.avatar_url = avatarUrl;

  const { error: updateError } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (updateError) return { error: updateError.message };

  revalidatePath("/", "layout");
  return {};
}
