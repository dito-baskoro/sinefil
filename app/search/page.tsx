import Link from "next/link";
import Image from "next/image";
import { MovieCard } from "@/components/movie-card";
import { DefaultAvatar } from "@/components/default-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchMovies } from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Pencarian" };

type UserHit = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean | null;
  is_banned: boolean | null;
};

async function searchUsers(query: string): Promise<UserHit[]> {
  if (!isSupabaseConfigured() || !query) return [];
  const supabase = await createClient();
  const escaped = query.replace(/[%_,]/g, (c) => `\\${c}`);
  const pattern = `%${escaped}%`;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, is_admin, is_banned")
    .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
    .limit(20);
  return (data ?? []) as UserHit[];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [movies, users] = query
    ? await Promise.all([searchMovies(query), searchUsers(query)])
    : [[], []];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {query ? `Hasil pencarian: "${query}"` : "Pencarian"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {query
            ? `${users.length} pengguna · ${movies.length} film.`
            : "Cari film Indonesia atau pengguna Sinefil."}
        </p>
      </header>

      <form action="/search" className="flex max-w-xl gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Cari film atau pengguna..."
          aria-label="Cari film atau pengguna"
        />
        <Button type="submit">Cari</Button>
      </form>

      {query && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Pengguna</h2>
          {users.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Tidak ada pengguna yang cocok.
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {users.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/profile/${u.username}`}
                    className="flex h-[78px] items-center gap-3 rounded-md border border-border p-3 hover:bg-secondary"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      {u.avatar_url ? (
                        <Image
                          src={u.avatar_url}
                          alt=""
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <DefaultAvatar />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {u.display_name || u.username}
                        </span>
                        {u.is_admin && (
                          <Badge variant="default" className="h-4 shrink-0 px-1.5 text-[10px] font-medium">
                            Admin
                          </Badge>
                        )}
                        {u.is_banned && (
                          <Badge variant="destructive" className="h-4 shrink-0 px-1.5 text-[10px] font-medium">
                            Banned
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        @{u.username}
                      </div>
                      {u.bio && (
                        <div className="truncate text-xs text-muted-foreground">
                          {u.bio}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {query && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Film</h2>
          {movies.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Tidak ada film yang cocok.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {movies.map((m) => (
                <MovieCard key={m.id} movie={m} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
