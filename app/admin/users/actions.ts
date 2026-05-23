"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function setBanStatus(targetUserId: string, banned: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak login" };
  if (user.id === targetUserId) return { error: "Tidak bisa banned diri sendiri" };

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) return { error: "Bukan admin" };

  const { data: target } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!target) return { error: "User tidak ditemukan" };
  if (target.is_admin) return { error: "Tidak bisa banned sesama admin" };

  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ is_banned: banned })
    .eq("id", targetUserId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setAdminStatus(targetUserId: string, admin: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak login" };
  if (user.id === targetUserId) return { error: "Tidak bisa ubah role sendiri" };

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) return { error: "Bukan admin" };

  const { data: target } = await supabase
    .from("profiles")
    .select("is_banned")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!target) return { error: "User tidak ditemukan" };
  if (admin && target.is_banned) return { error: "User sedang di-banned" };

  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ is_admin: admin })
    .eq("id", targetUserId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}
