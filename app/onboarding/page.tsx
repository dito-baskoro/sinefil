import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Lengkapi profil" };

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Lengkapi profil</CardTitle>
          <CardDescription>
            Pilih username unik dan upload foto biar gampang dikenali. Bisa diubah belakangan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            initialDisplayName={profile?.display_name ?? null}
            initialAvatarUrl={profile?.avatar_url ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
