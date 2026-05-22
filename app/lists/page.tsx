import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { formatDate, tmdbImage } from "@/lib/utils";

export const metadata = { title: "List film" };

type ListRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  user_id: string;
  profile: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
  list_items: { movie: { poster_path: string | null } | { poster_path: string | null }[] | null }[] | null;
};

export default async function ListsIndex() {
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Supabase belum dikonfigurasi.</p>;
  }
  const supabase = await createClient();
  const { data: lists } = await supabase
    .from("lists")
    .select(
      `id, title, description, created_at, user_id,
       profile:profiles!lists_user_id_fkey(username, display_name),
       list_items(movie:movies!list_items_movie_id_fkey(poster_path))`
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(40);

  const rows = (lists ?? []) as ListRow[];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">List film</h1>
        <Button asChild>
          <Link href="/lists/new">Buat list baru</Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Belum ada list publik. Jadi yang pertama bikin!
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((l) => {
            const profile = Array.isArray(l.profile) ? l.profile[0] : l.profile;
            const posters = (l.list_items ?? [])
              .map((it) => {
                const m = Array.isArray(it.movie) ? it.movie[0] : it.movie;
                return m?.poster_path ?? null;
              })
              .filter((p): p is string => Boolean(p))
              .slice(0, 4);
            return (
              <li key={l.id}>
                <Link
                  href={`/lists/${l.id}`}
                  className="flex gap-4 rounded-md border border-border p-3 hover:bg-secondary"
                >
                  <div className="flex shrink-0 gap-1">
                    {Array.from({ length: 4 }).map((_, i) => {
                      const poster = tmdbImage(posters[i] ?? null, "w185");
                      return (
                        <div
                          key={i}
                          className="relative h-20 w-14 overflow-hidden rounded border border-border bg-secondary"
                        >
                          {poster && (
                            <Image src={poster} alt="" fill sizes="56px" className="object-cover" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-1 font-semibold">{l.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      oleh @{profile?.username ?? "?"} · {formatDate(l.created_at)}
                    </p>
                    {l.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {l.description}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
