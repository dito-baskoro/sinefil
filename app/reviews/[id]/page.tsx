import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { StarRating } from "@/components/star-rating";
import { DefaultAvatar } from "@/components/default-avatar";
import { Badge } from "@/components/ui/badge";
import { ReviewDialog } from "@/components/review-dialog";
import { DeleteReviewButton } from "@/components/delete-review-button";
import { formatDate, tmdbImage } from "@/lib/utils";
import {
  REACTION_KINDS,
  type FamilyMetricKey,
  type FamilyMetrics,
  type ReactionKind,
  type VibeTag,
} from "@/lib/types";
import { ReactionBar } from "./reaction-bar";
import { CommentForm, DeleteCommentButton } from "./comment-form";

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) return { title: "Review" };
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("movie:movies!reviews_movie_id_fkey(title)")
    .eq("id", id)
    .maybeSingle();
  const movie = data?.movie && (Array.isArray(data.movie) ? data.movie[0] : data.movie);
  return { title: movie?.title ? `Review · ${movie.title}` : "Review" };
}

export default async function ReviewDetailPage({ params }: { params: Promise<Params> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = await createClient();

  const { data: review } = await supabase
    .from("reviews")
    .select(
      `id, rating, review_text, contains_spoiler, created_at, updated_at, user_id, movie_id,
       author:profiles!reviews_user_id_fkey(id, username, display_name, avatar_url, is_admin),
       movie:movies!reviews_movie_id_fkey(id, tmdb_id, title, poster_path, release_date),
       family_metrics(*),
       review_vibe_tags(vibe_tag_id)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!review) notFound();

  const author = Array.isArray(review.author) ? review.author[0] : review.author;
  const movie = Array.isArray(review.movie) ? review.movie[0] : review.movie;
  if (!author || !movie) notFound();

  const { data: vibeTags } = await supabase
    .from("vibe_tags")
    .select("id, slug, label_id, emoji");
  const tagById = new Map(((vibeTags as VibeTag[] | null) ?? []).map((vt) => [vt.id, vt]));
  const vibes = (review.review_vibe_tags ?? [])
    .map((rvt) => tagById.get(rvt.vibe_tag_id))
    .filter((x): x is VibeTag => Boolean(x));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerIsAdmin = false;
  if (user) {
    const { data: viewer } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    viewerIsAdmin = Boolean(viewer?.is_admin);
  }

  const isOwner = user?.id === author.id;
  const canEdit = isOwner;
  const canDelete = isOwner || viewerIsAdmin;

  const family = Array.isArray(review.family_metrics)
    ? review.family_metrics[0]
    : (review.family_metrics as FamilyMetrics | null);
  const vibeIds = (review.review_vibe_tags ?? []).map((rvt) => rvt.vibe_tag_id);

  let allVibeTags: VibeTag[] = [];
  if (canEdit) {
    const { data } = await supabase
      .from("vibe_tags")
      .select("id, slug, label_id, emoji")
      .order("id");
    allVibeTags = (data as VibeTag[] | null) ?? [];
  }

  const { data: reactionRows } = await supabase
    .from("review_reactions")
    .select("kind, user_id")
    .eq("review_id", review.id);

  const counts = Object.fromEntries(
    REACTION_KINDS.map((r) => [r.kind, 0]),
  ) as Record<ReactionKind, number>;
  const activeForUser: ReactionKind[] = [];
  for (const r of reactionRows ?? []) {
    const kind = r.kind as ReactionKind;
    if (kind in counts) {
      counts[kind] += 1;
      if (user && r.user_id === user.id) activeForUser.push(kind);
    }
  }

  type CommentRow = {
    id: string;
    body: string;
    created_at: string;
    user_id: string;
    author: { id: string; username: string; display_name: string | null; avatar_url: string | null } | { id: string; username: string; display_name: string | null; avatar_url: string | null }[] | null;
  };
  const { data: commentRows } = await supabase
    .from("review_comments")
    .select(
      `id, body, created_at, user_id,
       author:profiles!review_comments_user_id_fkey(id, username, display_name, avatar_url)`
    )
    .eq("review_id", review.id)
    .order("created_at", { ascending: true });

  const comments = ((commentRows ?? []) as CommentRow[])
    .map((c) => {
      const a = Array.isArray(c.author) ? c.author[0] : c.author;
      return a ? { ...c, author: a } : null;
    })
    .filter(Boolean) as (Omit<CommentRow, "author"> & {
    author: { id: string; username: string; display_name: string | null; avatar_url: string | null };
  })[];

  const poster = tmdbImage(movie.poster_path, "w342");

  return (
    <div className="space-y-8">
      <article className="space-y-4 rounded-md border border-border p-4">
        <header className="flex items-start justify-between gap-3">
          <Link
            href={`/profile/${author.username}`}
            className="flex items-center gap-2 hover:underline"
          >
            <div className="h-9 w-9 overflow-hidden rounded-full border border-border">
              {author.avatar_url ? (
                <Image
                  src={author.avatar_url}
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <DefaultAvatar />
              )}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                {author.display_name || author.username}
                {author.is_admin && (
                  <Badge variant="default" className="h-4 px-1.5 text-[10px] font-medium">
                    Admin
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                @{author.username} · {formatDate(review.created_at)}
                {review.updated_at &&
                  new Date(review.updated_at).getTime() - new Date(review.created_at).getTime() > 1000 && (
                    <span title={`Diedit ${formatDate(review.updated_at)}`}> · diedit</span>
                  )}
              </p>
            </div>
          </Link>

          {(canEdit || canDelete) && (
            <div className="flex shrink-0 flex-wrap gap-2">
              {canEdit && (
                <ReviewDialog
                  movieDbId={movie.id}
                  movieTitle={movie.title}
                  vibeTags={allVibeTags}
                  triggerLabel="Edit"
                  triggerSize="sm"
                  triggerVariant="outline"
                  initial={{
                    rating: Number(review.rating),
                    reviewText: review.review_text,
                    containsSpoiler: review.contains_spoiler,
                    family: family
                      ? {
                          family_safe: family.family_safe ?? undefined,
                          awkward_scene_meter: family.awkward_scene_meter ?? undefined,
                          ketiduran_probability: family.ketiduran_probability ?? undefined,
                          nangis_meter: family.nangis_meter ?? undefined,
                        }
                      : {},
                    vibeIds,
                  }}
                />
              )}
              {canDelete && (
                <DeleteReviewButton
                  reviewId={review.id}
                  redirectTo={`/movies/${movie.tmdb_id}`}
                  label={isOwner ? "Hapus" : "Hapus (admin)"}
                />
              )}
            </div>
          )}
        </header>

        <div className="flex gap-4">
          <Link
            href={`/movies/${movie.tmdb_id}`}
            className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-md border border-border bg-secondary"
          >
            {poster && (
              <Image src={poster} alt="" fill sizes="96px" className="object-cover" />
            )}
          </Link>
          <div className="min-w-0 flex-1 space-y-2">
            <Link
              href={`/movies/${movie.tmdb_id}`}
              className="block text-lg font-semibold hover:underline"
            >
              {movie.title}
            </Link>
            <StarRating value={Number(review.rating)} />
            {review.contains_spoiler ? (
              <p className="italic text-muted-foreground">
                [review berisi spoiler — buka di halaman ini buat baca]
              </p>
            ) : null}
            {review.review_text && (
              <p className="whitespace-pre-wrap text-sm">{review.review_text}</p>
            )}
            {vibes.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {vibes.map((vt) => (
                  <Badge key={vt.id} variant="secondary" className="text-[10px] font-normal">
                    {vt.emoji} {vt.label_id}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reaksi</h2>
        <ReactionBar
          reviewId={review.id}
          initialCounts={counts}
          initialActive={activeForUser}
          isLoggedIn={Boolean(user)}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Komentar ({comments.length})</h2>

        {user ? (
          <CommentForm reviewId={review.id} />
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="underline">
              Login
            </Link>{" "}
            buat ikut komentar.
          </p>
        )}

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada komentar.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/profile/${c.author.username}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <div className="h-6 w-6 overflow-hidden rounded-full border border-border">
                      {c.author.avatar_url ? (
                        <Image
                          src={c.author.avatar_url}
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
                    <span className="text-xs font-medium">
                      {c.author.display_name || c.author.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {formatDate(c.created_at)}
                    </span>
                  </Link>
                  {user?.id === c.user_id && (
                    <DeleteCommentButton commentId={c.id} reviewId={review.id} />
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
