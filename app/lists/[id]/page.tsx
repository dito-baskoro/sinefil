import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, tmdbImage } from "@/lib/utils";
import { BookmarkListButton } from "./bookmark-button";
import { AdminDeleteListButton } from "./admin-delete-button";

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) return { title: "List" };
  const supabase = await createClient();
  const { data: list } = await supabase.from("lists").select("title").eq("id", id).maybeSingle();
  return { title: list?.title ?? "List" };
}

type ListItemRow = {
  position: number;
  note: string | null;
  movie: { id: number; tmdb_id: number; title: string; poster_path: string | null; release_date: string | null } | { id: number; tmdb_id: number; title: string; poster_path: string | null; release_date: string | null }[] | null;
};

export default async function ListDetail({ params }: { params: Promise<Params> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = await createClient();

  const { data: list } = await supabase
    .from("lists")
    .select(
      `id, title, description, is_public, created_at, updated_at, user_id,
       profile:profiles!lists_user_id_fkey(username, display_name, avatar_url)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!list) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === list.user_id;

  let isAdmin = false;
  if (user && !isOwner) {
    const { data: me } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = Boolean(me?.is_admin);
  }

  const profile = Array.isArray(list.profile) ? list.profile[0] : list.profile;

  const { count: bookmarkCount } = await supabase
    .from("list_bookmarks")
    .select("list_id", { count: "exact", head: true })
    .eq("list_id", id);

  let initialBookmarked = false;
  if (user && !isOwner) {
    const { data: existingBookmark } = await supabase
      .from("list_bookmarks")
      .select("list_id")
      .eq("user_id", user.id)
      .eq("list_id", id)
      .maybeSingle();
    initialBookmarked = Boolean(existingBookmark);
  }

  const { data: itemRows } = await supabase
    .from("list_items")
    .select(
      `position, note,
       movie:movies!list_items_movie_id_fkey(id, tmdb_id, title, poster_path, release_date)`
    )
    .eq("list_id", id)
    .order("position", { ascending: true });

  const items = ((itemRows ?? []) as ListItemRow[])
    .map((r) => {
      const m = Array.isArray(r.movie) ? r.movie[0] : r.movie;
      return m ? { position: r.position, note: r.note, movie: m } : null;
    })
    .filter(Boolean) as { position: number; note: string | null; movie: NonNullable<Exclude<ListItemRow["movie"], unknown[] | null>> }[];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-3xl font-bold">{list.title}</h1>
          {isOwner ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/lists/${list.id}/edit`}>Edit</Link>
            </Button>
          ) : (
            <div className="flex items-start gap-2">
              {list.is_public && (
                <BookmarkListButton
                  listId={list.id}
                  initialBookmarked={initialBookmarked}
                  initialCount={bookmarkCount ?? 0}
                  isLoggedIn={Boolean(user)}
                />
              )}
              {isAdmin && <AdminDeleteListButton listId={list.id} />}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {profile && (
            <Link href={`/profile/${profile.username}`} className="hover:underline">
              @{profile.username}
            </Link>
          )}
          <span>·</span>
          <span>{formatDate(list.created_at)}</span>
          <span>·</span>
          <span>{items.length} film</span>
          {!list.is_public && <Badge variant="secondary">Privat</Badge>}
        </div>
        {list.description && <p className="max-w-prose text-sm">{list.description}</p>}
      </header>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          List ini masih kosong.
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((it) => {
            const poster = tmdbImage(it.movie.poster_path, "w185");
            return (
              <li
                key={it.movie.id}
                className="flex gap-3 rounded-md border border-border p-3"
              >
                <span className="w-6 shrink-0 text-center text-lg font-bold text-muted-foreground">
                  {it.position}
                </span>
                <Link
                  href={`/movies/${it.movie.tmdb_id}`}
                  className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-md border border-border bg-secondary"
                >
                  {poster && (
                    <Image src={poster} alt="" fill sizes="80px" className="object-cover" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/movies/${it.movie.tmdb_id}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {it.movie.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {it.movie.release_date?.slice(0, 4) ?? "—"}
                  </p>
                  {it.note && <p className="mt-1 text-xs">{it.note}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
