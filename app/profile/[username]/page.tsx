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

  const [
    { count: watchedCount },
    { count: wantCount },
    { count: followerCount },
    { count: followingCount },
    { count: listCount },
    { count: bookmarkCount },
    { count: reviewCount },
  ] = await Promise.all([
    supabase
      .from("watchlist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("status", "watched"),
    supabase
      .from("watchlist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("status", "want_to_watch"),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("followee_id", profile.id),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    supabase
      .from("lists")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("is_public", true),
    supabase
      .from("list_bookmarks")
      .select("list_id", { count: "exact", head: true })
      .eq("user_id", profile.id),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id),
  ]);

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
    .select(
      "position, movie:movies!profile_favorites_movie_id_fkey(id, tmdb_id, title, poster_path, backdrop_path, release_date)"
    )
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
            backdrop_path: (m.backdrop_path as string | null) ?? null,
            release_date: (m.release_date as string | null) ?? "",
          }
        : null;
    })
    .filter(Boolean) as {
    position: number;
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    backdrop_path: string | null;
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

  const profileBackdrop = tmdbImage(favorites[0]?.backdrop_path ?? favorites[0]?.poster_path, "w780");
  const favoritePickerInitial = favorites.map((f) => ({
    tmdb_id: f.tmdb_id,
    title: f.title,
    poster_path: f.poster_path,
    release_date: f.release_date,
  }));
  const favoriteSlots = Array.from({ length: 4 }, (_, i) => favorites[i] ?? null);

  return (
    <div className="space-y-8 sm:-mt-8">
      <header
        className={`relative flex flex-col items-start gap-4 overflow-hidden p-0 sm:flex-row sm:items-end sm:p-8 ${
          profileBackdrop ? "sm:h-[500px]" : ""
        }`}
      >
        {profileBackdrop && (
          <>
            <Image
              src={profileBackdrop}
              alt=""
              fill
              priority
              sizes="100vw"
              className="hidden object-cover sm:block"
            />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-background via-background/80 to-background/25 sm:block" />
            <div className="absolute inset-x-0 bottom-0 hidden h-56 bg-gradient-to-t from-background via-background/85 to-transparent sm:block" />
          </>
        )}
        <div className="flex w-full items-center gap-4 sm:w-auto">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-[rgb(102,119,136)] bg-background">
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
          <ProfileStats
            username={profile.username}
            films={watchedCount ?? 0}
            reviews={reviewCount ?? 0}
            lists={listCount ?? 0}
            following={followingCount ?? 0}
            followers={followerCount ?? 0}
            className="flex-1 sm:hidden"
            compact
          />
        </div>
        <div className="relative flex-1">
          <div className="flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-x-5 sm:gap-y-2">
            <div className="space-y-1">
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
            </div>
            <ProfileStats
              username={profile.username}
              films={watchedCount ?? 0}
              reviews={reviewCount ?? 0}
              lists={listCount ?? 0}
              following={followingCount ?? 0}
              followers={followerCount ?? 0}
              className="hidden sm:flex"
            />
          </div>
        </div>
        {isOwner ? (
          <div className="relative flex gap-2">
            <EditBioDialog
              initialBio={profile.bio ?? ""}
              initialDisplayName={profile.display_name ?? ""}
              initialAvatarUrl={profile.avatar_url ?? null}
              initialLocation={profile.location ?? ""}
            />
            <form action="/auth/sign-out" method="post">
              <button className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-secondary sm:bg-black sm:text-white sm:hover:bg-black/80">
                Keluar
              </button>
            </form>
          </div>
        ) : (
          <div className="relative">
            <FollowButton
              followeeId={profile.id}
              username={profile.username}
              initialFollowing={initialFollowing}
              isLoggedIn={Boolean(user)}
            />
          </div>
        )}
      </header>

      {isOwner && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={`/profile/${profile.username}/bookmarks`}
            className="inline-flex items-center gap-1.5 rounded-full border border-input px-2.5 py-1 font-medium hover:bg-secondary"
          >
            <span className="text-muted-foreground">List tersimpan</span>
            <span className="tabular-nums">{bookmarkCount ?? 0}</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-input px-2.5 py-1 font-medium">
            <span className="text-muted-foreground">Mau nonton</span>
            <span className="tabular-nums">{wantCount ?? 0}</span>
          </span>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Film favorit</h2>
          {isOwner && (
            <EditFavoritesDialog
              initialFavorites={favoritePickerInitial}
            />
          )}
        </div>
        <div className="grid max-w-md grid-cols-4 gap-2">
          {favoriteSlots.map((fav, i) => {
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
            if (isOwner) {
              return (
                <EditFavoritesDialog
                  key={`fav-empty-${i}`}
                  initialFavorites={favoritePickerInitial}
                  trigger={
                    <button
                      type="button"
                      className="flex aspect-[2/3] w-full items-center justify-center rounded-md border border-dashed border-border bg-secondary/40 text-center text-[10px] text-muted-foreground transition-colors hover:border-input hover:bg-secondary hover:text-foreground"
                    >
                      + Tambah
                    </button>
                  }
                />
              );
            }
            return (
              <div
                key={`fav-empty-${i}`}
                className="flex aspect-[2/3] items-center justify-center rounded-md border border-dashed border-border bg-secondary/40 text-center text-[10px] text-muted-foreground"
              >
                —
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Review terbaru</h2>
          {reviews.length > 0 && (
            <Link
              href={`/profile/${profile.username}/reviews`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              See all reviews
            </Link>
          )}
        </div>
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

const NUM = new Intl.NumberFormat("id-ID");

function ProfileStats({
  username,
  films,
  reviews,
  lists,
  following,
  followers,
  className = "",
  compact = false,
}: {
  username: string;
  films: number;
  reviews: number;
  lists: number;
  following: number;
  followers: number;
  className?: string;
  compact?: boolean;
}) {
  const items: Array<{ label: string; value: number; href: string | null }> = [
    { label: "Films", value: films, href: null },
    { label: "Reviews", value: reviews, href: `/profile/${username}/reviews` },
    { label: "Lists", value: lists, href: `/profile/${username}/lists` },
    { label: "Following", value: following, href: `/profile/${username}/following` },
    { label: "Followers", value: followers, href: `/profile/${username}/followers` },
  ];

  const itemBaseClasses =
    "group flex flex-col items-center px-1.5 sm:min-w-[5.75rem] sm:px-4 sm:first:pl-0 sm:last:pr-0";

  return (
    <dl className={`grid w-full grid-cols-3 gap-y-3 py-1 sm:w-auto sm:max-w-full sm:overflow-x-auto sm:[scrollbar-width:none] ${className}`}>
      {items.map((it, index) => {
        const itemClasses = [
          itemBaseClasses,
          index % 3 === 0 ? "border-l-0" : "border-l border-[#26313b]",
          index === 0 ? "sm:border-l-0" : "sm:border-l sm:border-[#26313b]",
        ].join(" ");
        const inner = (
          <>
            <dd className={`${compact ? "text-[1.45rem]" : "text-[1.85rem]"} font-extrabold leading-none tabular-nums text-[#dbe3eb] transition-colors group-hover:text-foreground sm:text-[2.35rem]`}>
              {NUM.format(it.value)}
            </dd>
            <dt className={`${compact ? "mt-1.5 text-[0.54rem] tracking-[0.11em]" : "mt-2 text-[0.62rem] tracking-[0.14em]"} text-center font-medium uppercase leading-none text-[#84909f] sm:text-[0.68rem] sm:tracking-[0.16em]`}>
              {it.label}
            </dt>
          </>
        );

        return it.href ? (
          <Link
            key={it.label}
            href={it.href}
            className={`${itemClasses} rounded-sm transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
          >
            {inner}
          </Link>
        ) : (
          <div key={it.label} className={itemClasses}>
            {inner}
          </div>
        );
      })}
    </dl>
  );
}
