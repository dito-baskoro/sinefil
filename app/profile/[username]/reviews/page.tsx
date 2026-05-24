import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate, tmdbImage } from "@/lib/utils";
import type { VibeTag } from "@/lib/types";

type Params = { username: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `Review @${username}` };
}

export default async function ProfileReviewsPage({ params }: { params: Promise<Params> }) {
  if (!isSupabaseConfigured()) notFound();
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

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
    .order("created_at", { ascending: false });

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
      vibes: (r.review_vibe_tags ?? [])
        .map((rvt) => tagById.get(rvt.vibe_tag_id))
        .filter((x): x is VibeTag => Boolean(x)),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/profile/${profile.username}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← @{profile.username}
        </Link>
        <h1 className="text-2xl font-bold">
          Review dari {profile.display_name || `@${profile.username}`}
        </h1>
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
    </div>
  );
}
