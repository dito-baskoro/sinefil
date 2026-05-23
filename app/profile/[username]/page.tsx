import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { StarRating } from "@/components/star-rating";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, tmdbImage } from "@/lib/utils";
import { EditBioDialog } from "./edit-bio-dialog";
import { EditFavoritesDialog } from "./edit-favorites-dialog";
import { FollowButton } from "./follow-button";
import { DefaultAvatar } from "@/components/default-avatar";
import type { VibeTag } from "@/lib/types";

type Params = { username: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: { params: Promise<Params> }) {
  if (!isSupabaseConfigured()) notFound();
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, location, is_admin, is_banned, created_at")

    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === profile.id;

  const { count: watchedCount } = await supabase
    .from("watchlist")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("status", "watched");

  const { count: wantCount } = await supabase
    .from("watchlist")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("status", "want_to_watch");

  const { count: followerCount } = await supabase
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("followee_id", profile.id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("follower_id", profile.id);

  const { count: listCount } = await supabase
    .from("lists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_public", true);

  const { count: bookmarkCount } = await supabase
    .from("list_bookmarks")
    .select("list_id", { count: "exact", head: true })
    .eq("user_id", profile.id);

  let initialFollowing = false;
  if (user && !isOwner) {
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("followee_id", profile.id)
      .maybeSingle();
    initialFollowing = Boolean(existingFollow);
  }

  const { data: favoriteRows } = await supabase
    .from("profile_favorites")
    .select("position, movie:movies!profile_favorites_movie_id_fkey(id, tmdb_id, title, poster_path, release_date)")
    .eq("user_id", profile.id)
    .order("position", { ascending: true });

  const favorites = (favoriteRows ?? [])
    .map((r) => {
      const m = Array.isArray(r.movie) ? r.movie[0] : r.movie;
      return m
        ? {
            position: r.position as number,
            tmdb_id: m.tmdb_id as number,
            title: m.title as string,
            poster_path: (m.poster_path as string | null) ?? null,
            release_date: (m.release_date as string | null) ?? "",
          }
        : null;
    })
    .filter(Boolean) as {
    position: number;
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    release_date: string;
  }[];

  const { data: vibeTags } = await supabase.from("vibe_tags").select("id, slug, label_id, emoji");
  const tagById = new Map(((vibeTags as VibeTag[] | null) ?? []).map((vt) => [vt.id, vt]));

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select(
      `id, rating, review_text, contains_spoiler, created_at, movie_id,
       movie:movies!reviews_movie_id_fkey(id, tmdb_id, title, poster_path, release_date),
       review_vibe_tags(vibe_tag_id)`
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const reviews = (reviewRows ?? []).map((r: {
    id: string;
    rating: number;
    review_text: string | null;
    contains_spoiler: boolean;
    created_at: string;
    movie_id: number;
    movie: { id: number; tmdb_id: number; title: string; poster_path: string | null; release_date: string | null } | { id: number; tmdb_id: number; title: string; poster_path: string | null; release_date: string | null }[] | null;
    review_vibe_tags: { vibe_tag_id: number }[] | null;
  }) => {
    const movie = Array.isArray(r.movie) ? r.movie[0] : r.movie;
    return {
      id: r.id,
      rating: Number(r.rating),
      review_text: r.review_text,
      contains_spoiler: r.contains_spoiler,
      created_at: r.created_at,
      movie,
      vibes: (r.review_vibe_tags ?? []).map((rvt) => tagById.get(rvt.vibe_tag_id)).filter((x): x is VibeTag => Boolean(x)),
    };
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="h-24 w-24 overflow-hidden rounded-full border border-border">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={96}
              height={96}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <DefaultAvatar />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            {profile.display_name || profile.username}
            {profile.is_admin && (
              <Badge variant="default" className="h-5 px-2 text-[11px] font-medium">
                Admin
              </Badge>
            )}
            {profile.is_banned && (
              <Badge variant="destructive" className="h-5 px-2 text-[11px] font-medium">
                Banned
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.location && (
            <p className="text-sm text-muted-foreground">📍 {profile.location}</p>
          )}
          {profile.bio && <p className="max-w-prose text-sm">{profile.bio}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm">
            <Link
              href={`/profile/${profile.username}/followers`}
              className="hover:underline"
            >
              <strong className="tabular-nums">{followerCount ?? 0}</strong>{" "}
              <span className="text-muted-foreground">follower</span>
            </Link>
            <Link
              href={`/profile/${profile.username}/following`}
              className="hover:underline"
            >
              <strong className="tabular-nums">{followingCount ?? 0}</strong>{" "}
              <span className="text-muted-foreground">following</span>
            </Link>
            <Link
              href={`/profile/${profile.username}/lists`}
              className="inline-flex items-center gap-1 rounded-full border border-input px-2.5 py-0.5 text-xs font-medium hover:bg-secondary"
            >
              List film <span className="tabular-nums text-muted-foreground">{listCount ?? 0}</span>
            </Link>
            <Link
              href={`/profile/${profile.username}/bookmarks`}
              className="inline-flex items-center gap-1 rounded-full border border-input px-2.5 py-0.5 text-xs font-medium hover:bg-secondary"
            >
              List tersimpan <span className="tabular-nums text-muted-foreground">{bookmarkCount ?? 0}</span>
            </Link>
          </div>
        </div>
        {isOwner ? (
          <div className="flex gap-2">
            <EditBioDialog
              initialBio={profile.bio ?? ""}
              initialDisplayName={profile.display_name ?? ""}
              initialAvatarUrl={profile.avatar_url ?? null}
              initialLocation={profile.location ?? ""}
            />
            <form action="/auth/sign-out" method="post">
              <button className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-secondary">
                Keluar
              </button>
            </form>
          </div>
        ) : (
          <FollowButton
            followeeId={profile.id}
            username={profile.username}
            initialFollowing={initialFollowing}
            isLoggedIn={Boolean(user)}
          />
        )}
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Film favorit</h2>
          {isOwner && (
            <EditFavoritesDialog
              initialFavorites={favorites.map((f) => ({
                tmdb_id: f.tmdb_id,
                title: f.title,
                poster_path: f.poster_path,
                release_date: f.release_date,
              }))}
            />
          )}
        </div>
        <div className="grid max-w-md grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => {
            const fav = favorites[i];
            if (fav) {
              const poster = tmdbImage(fav.poster_path, "w185");
              return (
                <Link
                  key={`fav-${i}`}
                  href={`/movies/${fav.tmdb_id}`}
                  className="group relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-secondary"
                >
                  {poster ? (
                    <Image
                      src={poster}
                      alt={fav.title}
                      fill
                      sizes="110px"
                      className="object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-2 text-center text-[10px]">
                      {fav.title}
                    </div>
                  )}
                </Link>
              );
            }
            return (
              <div
                key={`fav-empty-${i}`}
                className="flex aspect-[2/3] items-center justify-center rounded-md border border-dashed border-border bg-secondary/40 text-center text-[10px] text-muted-foreground"
              >
                {isOwner ? "+ Tambah" : "—"}
              </div>
            );
          })}
        </div>
        <div className="flex max-w-md flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm">
          <span>
            <strong className="tabular-nums">{reviews.length}</strong>{" "}
            <span className="text-muted-foreground">review</span>
          </span>
          <span>
            <strong className="tabular-nums">{watchedCount ?? 0}</strong>{" "}
            <span className="text-muted-foreground">ditonton</span>
          </span>
          <span>
            <strong className="tabular-nums">{wantCount ?? 0}</strong>{" "}
            <span className="text-muted-foreground">mau nonton</span>
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Review terbaru</h2>
        {reviews.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Belum ada review.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {reviews.map((r) => {
              if (!r.movie) return null;
              const poster = tmdbImage(r.movie.poster_path, "w185");
              return (
                <Card key={r.id}>
                  <CardContent className="flex gap-3 p-3">
                    <Link
                      href={`/movies/${r.movie.tmdb_id}`}
                      className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-md border border-border bg-secondary"
                    >
                      {poster ? (
                        <Image src={poster} alt="" fill sizes="80px" className="object-cover" />
                      ) : null}
                    </Link>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Link
                        href={`/movies/${r.movie.tmdb_id}`}
                        className="block text-sm font-semibold hover:underline"
                      >
                        {r.movie.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <StarRating value={r.rating} size="sm" />
                        <span>{formatDate(r.created_at)}</span>
                      </div>
                      {r.review_text && !r.contains_spoiler && (
                        <p className="line-clamp-3 text-xs text-muted-foreground">{r.review_text}</p>
                      )}
                      {r.contains_spoiler && (
                        <p className="text-xs italic text-muted-foreground">[review berisi spoiler]</p>
                      )}
                      {r.vibes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {r.vibes.slice(0, 3).map((vt) => (
                            <Badge key={vt.id} variant="secondary" className="text-[10px] font-normal">
                              {vt.emoji} {vt.label_id}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Link
                        href={`/reviews/${r.id}`}
                        className="inline-block text-xs text-muted-foreground hover:underline"
                      >
                        Reaksi & komentar →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
