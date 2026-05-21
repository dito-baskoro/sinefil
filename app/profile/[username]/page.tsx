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
    .select("id, username, display_name, avatar_url, bio, created_at")
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
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 rounded-full border border-border object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-secondary text-2xl font-semibold uppercase">
            {profile.username.slice(0, 2)}
          </div>
        )}
        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="max-w-prose text-sm">{profile.bio}</p>}
          <div className="flex flex-wrap gap-3 pt-1 text-sm">
            <span>
              <strong className="tabular-nums">{reviews.length}</strong>{" "}
              <span className="text-muted-foreground">review</span>
            </span>
            <span>
              <strong className="tabular-nums">{watchedCount ?? 0}</strong>{" "}
              <span className="text-muted-foreground">sudah ditonton</span>
            </span>
            <span>
              <strong className="tabular-nums">{wantCount ?? 0}</strong>{" "}
              <span className="text-muted-foreground">mau nonton</span>
            </span>
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <EditBioDialog initialBio={profile.bio ?? ""} />
            <form action="/auth/sign-out" method="post">
              <button className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-secondary">
                Keluar
              </button>
            </form>
          </div>
        )}
      </header>

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
