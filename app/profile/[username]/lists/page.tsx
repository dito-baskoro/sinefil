import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, tmdbImage } from "@/lib/utils";

type Params = { username: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `List @${username}` };
}

type ListRow = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  list_items: { movie: { poster_path: string | null } | { poster_path: string | null }[] | null }[] | null;
};

export default async function UserListsPage({ params }: { params: Promise<Params> }) {
  if (!isSupabaseConfigured()) notFound();
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === profile.id;

  const { data: lists } = await supabase
    .from("lists")
    .select(
      `id, title, description, is_public, created_at,
       list_items(movie:movies!list_items_movie_id_fkey(poster_path))`
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const rows = (lists ?? []) as ListRow[];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href={`/profile/${profile.username}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← @{profile.username}
          </Link>
          <h1 className="text-2xl font-bold">List</h1>
        </div>
        {isOwner && (
          <Button asChild>
            <Link href="/lists/new">List baru</Link>
          </Button>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Belum ada list.
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((l) => {
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
                    <div className="flex items-center gap-2">
                      <h2 className="line-clamp-1 font-semibold">{l.title}</h2>
                      {!l.is_public && <Badge variant="secondary">Privat</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(l.created_at)}</p>
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
