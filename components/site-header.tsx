import Link from "next/link";
import Image from "next/image";
import { Film, LogIn, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { DefaultAvatar } from "@/components/default-avatar";
import { HeaderMenu } from "@/components/header-menu";

export async function SiteHeader() {
  let isLoggedIn = false;
  let username: string | null = null;
  let avatarUrl: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      isLoggedIn = true;
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      username = profile?.username ?? null;
      avatarUrl = profile?.avatar_url ?? null;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <Film className="h-5 w-5 text-primary" />
          <span className="text-lg">Sinefil</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
          {isLoggedIn && (
            <Link href="/feed" className="hover:text-foreground">
              Aktivitas
            </Link>
          )}
          <Link href="/lists" className="hover:text-foreground">
            List
          </Link>
        </nav>

        <form action="/movies" className="ml-auto flex max-w-sm flex-1 items-center">
          <label className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              type="search"
              name="q"
              placeholder="Cari film Indonesia..."
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
              aria-label="Cari film"
            />
          </label>
        </form>

        {isLoggedIn ? (
          <Link
            href={username ? `/profile/${username}` : "/onboarding"}
            className="flex items-center gap-2 rounded-full text-sm hover:opacity-80"
            aria-label={username ? `Profil ${username}` : "Selesaikan onboarding"}
          >
            <div className="h-8 w-8 overflow-hidden rounded-full">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <DefaultAvatar />
              )}
            </div>
            <span className="hidden sm:inline">{username ?? "Lengkapi profil"}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Masuk
          </Link>
        )}

        <HeaderMenu isLoggedIn={isLoggedIn} />
      </div>
    </header>
  );
}
