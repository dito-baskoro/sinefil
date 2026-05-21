"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function updateBio(bio: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase belum dikonfigurasi." };
  const trimmed = bio.trim();
  if (trimmed.length > 280) return { error: "Bio maks 280 karakter." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi habis." };

  const { error } = await supabase
    .from("profiles")
    .update({ bio: trimmed || null })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile", "layout");
  return {};
}
