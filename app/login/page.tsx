import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/");
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Masuk ke Sinefil</CardTitle>
          <CardDescription>
            Platform film Indonesia. Login sekali, langsung review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
              {error}
            </div>
          )}

          {isSupabaseConfigured() ? (
            <GoogleSignInButton />
          ) : (
            <div className="rounded-md border border-dashed border-border bg-secondary/40 p-4 text-sm">
              <p className="font-semibold">Auth belum dinyalakan.</p>
              <p className="mt-1 text-muted-foreground">
                Set <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>.env.local</code> lalu
                konfigurasi Google OAuth di Supabase dashboard. Lihat <code>README.md</code>.
              </p>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Belum mau login? <Link href="/" className="underline">Lihat-lihat dulu</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
