import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate, tmdbImage } from "@/lib/utils";

type Params = { username: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `List tersimpan @${username}` };
}

type BookmarkRow = {
  created_at: string;
  list: {
    id: string;
    title: string;
    description: string | null;
    is_public: boolean;
    created_at: string;
    user_id: string;
    profile: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
    list_items: { movie: { poster_path: string | null } | { poster_path: string | null }[] | null }[] | null;
  } | {
    id: string;
    title: string;
    description: string | null;
    is_public: boolean;
    created_at: string;
    user_id: string;
    profile: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null;
    list_items: { movie: { poster_path: string | null } | { poster_path: string | null }[] | null }[] | null;
  }[] | null;
};

export default async function UserBookmarksPage({ params }: { params: Promise<Params> }) {
  if (!isSupabaseConfigured()) notFound();
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const { data: bookmarks } = await supabase
    .from("list_bookmarks")
    .select(
      `created_at,
       list:lists!list_bookmarks_list_id_fkey(
         id, title, description, is_public, created_at, user_id,
         profile:profiles!lists_user_id_fkey(username, display_name),
         list_items(movie:movies!list_items_movie_id_fkey(poster_path))
       )`
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const rows = ((bookmarks ?? []) as BookmarkRow[])
    .map((b) => {
      const list = Array.isArray(b.list) ? b.list[0] : b.list;
      if (!list || !list.is_public) return null;
      const author = Array.isArray(list.profile) ? list.profile[0] : list.profile;
      const posters = (list.list_items ?? [])
        .map((it) => {
          const m = Array.isArray(it.movie) ? it.movie[0] : it.movie;
          return m?.poster_path ?? null;
        })
        .filter((p): p is string => Boolean(p))
        .slice(0, 4);
      return { bookmarkedAt: b.created_at, list, author, posters };
    })
    .filter(Boolean) as {
      bookmarkedAt: string;
      list: { id: string; title: string; description: string | null; created_at: string };
      author: { username: string; display_name: string | null } | null;
      posters: string[];
    }[];

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/profile/${profile.username}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← @{profile.username}
        </Link>
        <h1 className="text-2xl font-bold">List tersimpan</h1>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Belum ada list yang disimpan.
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.list.id}>
              <Link
                href={`/lists/${r.list.id}`}
                className="flex gap-4 rounded-md border border-border p-3 hover:bg-secondary"
              >
                <div className="flex shrink-0 gap-1">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const poster = tmdbImage(r.posters[i] ?? null, "w185");
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
                  <h2 className="line-clamp-1 font-semibold">{r.list.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {r.author && <>oleh @{r.author.username} · </>}
                    disimpan {formatDate(r.bookmarkedAt)}
                  </p>
                  {r.list.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {r.list.description}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
