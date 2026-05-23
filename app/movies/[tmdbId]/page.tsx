import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ensureMovieCached } from "@/lib/movies";
import { tmdbImage, formatRuntime, formatDate, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { ReviewDialog } from "@/components/review-dialog";
import { ReviewCard, type ReviewCardData } from "@/components/review-card";
import { WatchlistButton } from "@/components/watchlist-button";
import {
  FAMILY_METRIC_KEYS,
  FAMILY_METRIC_LABELS,
  REACTION_KINDS,
  type FamilyMetrics,
  type FamilyMetricKey,
  type ReactionKind,
  type VibeTag,
  type WatchlistStatus,
} from "@/lib/types";

type Params = { tmdbId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tmdbId } = await params;
  const { detail } = await ensureMovieCached(Number(tmdbId));
  if (!detail) return { title: "Film tidak ditemukan" };
  return {
    title: detail.title,
    description: detail.overview?.slice(0, 160) ?? undefined,
    openGraph: detail.poster_path
      ? { images: [`https://image.tmdb.org/t/p/w780${detail.poster_path}`] }
      : undefined,
  };
}

export default async function MovieDetailPage({ params }: { params: Promise<Params> }) {
  const { tmdbId } = await params;
  const tmdbIdNum = Number(tmdbId);
  if (!Number.isFinite(tmdbIdNum)) notFound();

  const { detail, row } = await ensureMovieCached(tmdbIdNum);
  if (!detail) notFound();

  const backdrop = tmdbImage(detail.backdrop_path, "w780");
  const poster = tmdbImage(detail.poster_path, "w500");
  const runtime = formatRuntime(detail.runtime);
  const releaseDate = formatDate(detail.release_date);
  const cast = detail.credits?.cast?.slice(0, 6) ?? [];

  // Reviews + watchlist + current user (only when Supabase configured + movie row exists)
  let reviews: ReviewCardData[] = [];
  let familyAgg: Partial<Record<FamilyMetricKey, { avg: number; n: number }>> = {};
  let topVibes: { vibe: VibeTag; count: number }[] = [];
  let currentUserId: string | null = null;
  let watchlistStatus: WatchlistStatus | null = null;
  let vibeTags: VibeTag[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;

    const { data: tagsData } = await supabase
      .from("vibe_tags")
      .select("id, slug, label_id, emoji")
      .order("id");
    vibeTags = (tagsData as VibeTag[] | null) ?? [];

    if (row) {
      const { data: reviewRows } = await supabase
        .from("reviews")
        .select(
          `id, rating, review_text, contains_spoiler, created_at, updated_at, user_id,
           author:profiles!reviews_user_id_fkey(username, avatar_url, display_name, is_admin, is_banned),
           family_metrics(*),
           review_vibe_tags(vibe_tag_id)`
        )
        .eq("movie_id", row.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const tagById = new Map(vibeTags.map((vt) => [vt.id, vt]));
      reviews = (reviewRows ?? []).map((r: {
        id: string;
        rating: number;
        review_text: string | null;
        contains_spoiler: boolean;
        created_at: string;
        updated_at: string | null;
        user_id: string;
        author: { username: string; avatar_url: string | null; display_name: string | null; is_admin: boolean; is_banned: boolean } | { username: string; avatar_url: string | null; display_name: string | null; is_admin: boolean; is_banned: boolean }[] | null;
        family_metrics: FamilyMetrics | FamilyMetrics[] | null;
        review_vibe_tags: { vibe_tag_id: number }[] | null;
      }) => {
        const author = Array.isArray(r.author) ? r.author[0] : r.author;
        const fam = Array.isArray(r.family_metrics) ? r.family_metrics[0] : r.family_metrics;
        return {
          id: r.id,
          rating: Number(r.rating),
          review_text: r.review_text,
          contains_spoiler: r.contains_spoiler,
          created_at: r.created_at,
          updated_at: r.updated_at,
          author: author ?? { username: "?", avatar_url: null, display_name: null, is_admin: false, is_banned: false },
          family: fam ?? null,
          vibeTags: (r.review_vibe_tags ?? [])
            .map((rvt) => tagById.get(rvt.vibe_tag_id))
            .filter((x): x is VibeTag => Boolean(x)),
        };
      });

      const reviewIds = reviews.map((r) => r.id);
      if (reviewIds.length > 0) {
        const [{ data: reactionRows }, { data: commentRows }] = await Promise.all([
          supabase
            .from("review_reactions")
            .select("review_id, kind, user_id")
            .in("review_id", reviewIds),
          supabase
            .from("review_comments")
            .select("review_id")
            .in("review_id", reviewIds),
        ]);

        const countsByReview = new Map<string, Record<ReactionKind, number>>();
        const activeByReview = new Map<string, ReactionKind[]>();
        for (const id of reviewIds) {
          countsByReview.set(
            id,
            Object.fromEntries(REACTION_KINDS.map((r) => [r.kind, 0])) as Record<ReactionKind, number>,
          );
          activeByReview.set(id, []);
        }
        for (const row of reactionRows ?? []) {
          const kind = row.kind as ReactionKind;
          const counts = countsByReview.get(row.review_id as string);
          if (counts && kind in counts) counts[kind] += 1;
          if (currentUserId && row.user_id === currentUserId) {
            activeByReview.get(row.review_id as string)?.push(kind);
          }
        }

        const commentCountByReview = new Map<string, number>();
        for (const id of reviewIds) commentCountByReview.set(id, 0);
        for (const row of commentRows ?? []) {
          const id = row.review_id as string;
          commentCountByReview.set(id, (commentCountByReview.get(id) ?? 0) + 1);
        }

        reviews = reviews.map((r) => ({
          ...r,
          reactionCounts: countsByReview.get(r.id),
          activeReactions: activeByReview.get(r.id) ?? [],
          commentCount: commentCountByReview.get(r.id) ?? 0,
        }));
      }

      // Aggregate family metrics
      for (const key of FAMILY_METRIC_KEYS) {
        const values = reviews
          .map((r) => r.family?.[key] ?? null)
          .filter((v): v is number => v !== null);
        if (values.length) {
          familyAgg[key] = {
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            n: values.length,
          };
        }
      }

      // Top vibe tags
      const vibeCount = new Map<number, number>();
      for (const r of reviews) {
        for (const vt of r.vibeTags) {
          vibeCount.set(vt.id, (vibeCount.get(vt.id) ?? 0) + 1);
        }
      }
      topVibes = [...vibeCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => ({ vibe: vibeTags.find((vt) => vt.id === id)!, count }))
        .filter((x) => x.vibe);

      if (currentUserId) {
        const { data: wl } = await supabase
          .from("watchlist")
          .select("status")
          .eq("user_id", currentUserId)
          .eq("movie_id", row.id)
          .maybeSingle();
        watchlistStatus = (wl?.status as WatchlistStatus) ?? null;
      }
    }
  }

  const myReview = currentUserId ? reviews.find((r) => r.id) : undefined;
  const myReviewRow = currentUserId
    ? reviews.find((r) => (r as ReviewCardData & { user_id?: string }).author?.username) // placeholder
    : undefined;
  void myReview;
  void myReviewRow;

  return (
    <div className="space-y-8">
      {backdrop && (
        <div className="absolute left-0 right-0 top-14 -z-10 h-72 overflow-hidden opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]">
          <Image src={backdrop} alt="" fill priority className="object-cover" sizes="100vw" />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[200px_1fr] lg:grid-cols-[260px_1fr]">
        <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-secondary">
          {poster ? (
            <Image
              src={poster}
              alt={`Poster ${detail.title}`}
              fill
              sizes="(max-width: 768px) 60vw, 260px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
              {detail.title}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{detail.title}</h1>
            {detail.original_title && detail.original_title !== detail.title && (
              <p className="text-sm italic text-muted-foreground">{detail.original_title}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {[releaseDate, runtime].filter(Boolean).join(" · ")}
            </p>
          </div>

          {detail.genres && detail.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {detail.genres.map((g) => (
                <Badge key={g.id} variant="secondary">
                  {g.name}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <StarRating value={Math.round((detail.vote_average / 2) * 2) / 2} />
            <span className="text-muted-foreground">
              TMDB {detail.vote_average.toFixed(1)} ({detail.vote_count} suara)
            </span>
          </div>

          {detail.overview && (
            <p className="max-w-prose text-base leading-relaxed">{detail.overview}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {row && currentUserId ? (
              <>
                <ReviewDialog
                  movieDbId={row.id}
                  movieTitle={detail.title}
                  vibeTags={vibeTags}
                />
                <WatchlistButton movieDbId={row.id} current={watchlistStatus} />
              </>
            ) : row ? (
              <Button asChild>
                <Link href="/login">Masuk untuk Review</Link>
              </Button>
            ) : (
              <Button disabled title="Supabase belum aktif">
                Tulis Review (perlu Supabase)
              </Button>
            )}
          </div>
        </div>
      </div>

      {(Object.keys(familyAgg).length > 0 || topVibes.length > 0) && (
        <section className="grid gap-4 md:grid-cols-2">
          {Object.keys(familyAgg).length > 0 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="font-semibold">Aman Ditonton Bareng Keluarga? 🇮🇩</h3>
                <div className="space-y-2">
                  {FAMILY_METRIC_KEYS.map((key) => {
                    const a = familyAgg[key];
                    if (!a) return null;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{FAMILY_METRIC_LABELS[key].label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {a.avg.toFixed(1)} / 5 <span className="opacity-60">· {a.n}</span>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full bg-primary" style={{ width: `${(a.avg / 5) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {topVibes.length > 0 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="font-semibold">Vibe</h3>
                <div className="flex flex-wrap gap-1.5">
                  {topVibes.map(({ vibe, count }) => (
                    <Badge key={vibe.id} variant="secondary" className="font-normal">
                      {vibe.emoji} {vibe.label_id}
                      <span className="ml-1.5 text-[10px] text-muted-foreground">×{count}</span>
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Berdasarkan {reviews.length} review.</p>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {cast.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Pemeran utama</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {cast.map((c) => (
              <Card key={c.id} className="p-3">
                <CardContent className="space-y-1 p-0">
                  <p className="text-sm font-semibold leading-tight">{c.name}</p>
                  {c.character && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.character}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Review ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <div className={cn(
            "rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
          )}>
            Belum ada review. Jadi yang pertama nulis review!
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} isLoggedIn={Boolean(currentUserId)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
