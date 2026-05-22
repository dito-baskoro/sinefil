import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { StarRating } from "@/components/star-rating";
import { DefaultAvatar } from "@/components/default-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, tmdbImage } from "@/lib/utils";
import type { VibeTag } from "@/lib/types";

export const metadata = { title: "Aktivitas" };

type ProfileLite = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type ReviewRow = {
  id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  contains_spoiler: boolean;
  created_at: string;
  actor: ProfileLite | ProfileLite[] | null;
  movie: { id: number; tmdb_id: number; title: string; poster_path: string | null } | { id: number; tmdb_id: number; title: string; poster_path: string | null }[] | null;
  review_vibe_tags: { vibe_tag_id: number }[] | null;
};

type ListRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  actor: ProfileLite | ProfileLite[] | null;
  list_items: { movie: { poster_path: string | null } | { poster_path: string | null }[] | null }[] | null;
};

export default async function FeedPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: followRows } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", user.id);
  const followeeIds = (followRows ?? []).map((r) => r.followee_id as string);

  if (followeeIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Aktivitas</h1>
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Belum follow siapa-siapa.{" "}
          <Link href="/" className="underline">
            Jelajah halaman utama
          </Link>{" "}
          buat nemu orang yang seleranya cocok.
        </div>
      </div>
    );
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: vibeTags }, reviewQ, listQ] = await Promise.all([
    supabase.from("vibe_tags").select("id, slug, label_id, emoji"),
    supabase
      .from("reviews")
      .select(
        `id, user_id, rating, review_text, contains_spoiler, created_at,
         actor:profiles!reviews_user_id_fkey(id, username, display_name, avatar_url),
         movie:movies!reviews_movie_id_fkey(id, tmdb_id, title, poster_path),
         review_vibe_tags(vibe_tag_id)`
      )
      .in("user_id", followeeIds)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("lists")
      .select(
        `id, user_id, title, description, created_at,
         actor:profiles!lists_user_id_fkey(id, username, display_name, avatar_url),
         list_items(movie:movies!list_items_movie_id_fkey(poster_path))`
      )
      .in("user_id", followeeIds)
      .eq("is_public", true)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const tagById = new Map(((vibeTags as VibeTag[] | null) ?? []).map((vt) => [vt.id, vt]));

  type Event =
    | {
        kind: "review";
        at: string;
        actor: ProfileLite;
        review: { id: string; rating: number; review_text: string | null; contains_spoiler: boolean };
        movie: { tmdb_id: number; title: string; poster_path: string | null };
        vibes: VibeTag[];
      }
    | {
        kind: "list";
        at: string;
        actor: ProfileLite;
        list: { id: string; title: string; description: string | null };
        item_count: number;
        previews: string[];
      };

  const reviewEvents: Event[] = ((reviewQ.data ?? []) as ReviewRow[])
    .map((r) => {
      const actor = Array.isArray(r.actor) ? r.actor[0] : r.actor;
      const movie = Array.isArray(r.movie) ? r.movie[0] : r.movie;
      if (!actor || !movie) return null;
      return {
        kind: "review" as const,
        at: r.created_at,
        actor,
        review: {
          id: r.id,
          rating: Number(r.rating),
          review_text: r.review_text,
          contains_spoiler: r.contains_spoiler,
        },
        movie: { tmdb_id: movie.tmdb_id, title: movie.title, poster_path: movie.poster_path },
        vibes: (r.review_vibe_tags ?? [])
          .map((rvt) => tagById.get(rvt.vibe_tag_id))
          .filter((x): x is VibeTag => Boolean(x)),
      };
    })
    .filter(Boolean) as Event[];

  const listEvents: Event[] = ((listQ.data ?? []) as ListRow[])
    .map((l) => {
      const actor = Array.isArray(l.actor) ? l.actor[0] : l.actor;
      if (!actor) return null;
      const items = l.list_items ?? [];
      const previews = items
        .map((it) => {
          const m = Array.isArray(it.movie) ? it.movie[0] : it.movie;
          return m?.poster_path ?? null;
        })
        .filter((p): p is string => Boolean(p))
        .slice(0, 4);
      return {
        kind: "list" as const,
        at: l.created_at,
        actor,
        list: { id: l.id, title: l.title, description: l.description },
        item_count: items.length,
        previews,
      };
    })
    .filter(Boolean) as Event[];

  const events = [...reviewEvents, ...listEvents].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Aktivitas</h1>

      {events.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Belum ada aktivitas baru dari yang kamu follow.
        </div>
      ) : (
        <ul className="space-y-4">
          {events.map((e, i) => (
            <li key={`${e.kind}-${i}-${e.at}`}>
              <FeedItem event={e} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedItem({
  event,
}: {
  event:
    | {
        kind: "review";
        at: string;
        actor: ProfileLite;
        review: { id: string; rating: number; review_text: string | null; contains_spoiler: boolean };
        movie: { tmdb_id: number; title: string; poster_path: string | null };
        vibes: VibeTag[];
      }
    | {
        kind: "list";
        at: string;
        actor: ProfileLite;
        list: { id: string; title: string; description: string | null };
        item_count: number;
        previews: string[];
      };
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={`/profile/${event.actor.username}`}
            className="flex items-center gap-1.5 hover:underline"
          >
            <div className="h-6 w-6 overflow-hidden rounded-full border border-border">
              {event.actor.avatar_url ? (
                <Image
                  src={event.actor.avatar_url}
                  alt=""
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <DefaultAvatar />
              )}
            </div>
            <span className="font-medium text-foreground">
              {event.actor.display_name || event.actor.username}
            </span>
          </Link>
          <span>
            {event.kind === "review" ? "review film" : "bikin list"} ·{" "}
            {formatDate(event.at)}
          </span>
        </div>

        {event.kind === "review" ? (
          <div className="flex gap-3">
            <Link
              href={`/movies/${event.movie.tmdb_id}`}
              className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-md border border-border bg-secondary"
            >
              {(() => {
                const poster = tmdbImage(event.movie.poster_path, "w185");
                return poster ? (
                  <Image src={poster} alt="" fill sizes="80px" className="object-cover" />
                ) : null;
              })()}
            </Link>
            <div className="min-w-0 flex-1 space-y-1">
              <Link
                href={`/movies/${event.movie.tmdb_id}`}
                className="block font-semibold hover:underline"
              >
                {event.movie.title}
              </Link>
              <StarRating value={event.review.rating} size="sm" />
              {event.review.review_text && !event.review.contains_spoiler && (
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {event.review.review_text}
                </p>
              )}
              {event.review.contains_spoiler && (
                <p className="text-xs italic text-muted-foreground">[review berisi spoiler]</p>
              )}
              {event.vibes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {event.vibes.slice(0, 3).map((vt) => (
                    <Badge key={vt.id} variant="secondary" className="text-[10px] font-normal">
                      {vt.emoji} {vt.label_id}
                    </Badge>
                  ))}
                </div>
              )}
              <Link
                href={`/reviews/${event.review.id}`}
                className="inline-block text-xs text-muted-foreground hover:underline"
              >
                Reaksi & komentar →
              </Link>
            </div>
          </div>
        ) : (
          <Link href={`/lists/${event.list.id}`} className="flex gap-3 hover:opacity-90">
            <div className="flex shrink-0 gap-1">
              {Array.from({ length: 4 }).map((_, i) => {
                const poster = tmdbImage(event.previews[i] ?? null, "w185");
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
              <p className="font-semibold">{event.list.title}</p>
              <p className="text-xs text-muted-foreground">{event.item_count} film</p>
              {event.list.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {event.list.description}
                </p>
              )}
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
