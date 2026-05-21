import Link from "next/link";
import Image from "next/image";
import { Film, LogIn, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function SiteHeader() {
  let username: string | null = null;
  let avatarUrl: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
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

        {username ? (
          <Link
            href={`/profile/${username}`}
            className="flex items-center gap-2 rounded-full text-sm hover:opacity-80"
            aria-label={`Profil ${username}`}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold uppercase">
                {username.slice(0, 2)}
              </span>
            )}
            <span className="hidden sm:inline">{username}</span>
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
      </div>
    </header>
  );
}
