import Link from "next/link";
import Image from "next/image";
import { MovieCard } from "@/components/movie-card";
import { ReviewCard, type ReviewCardData } from "@/components/review-card";
import { StarRating } from "@/components/star-rating";
import { Badge } from "@/components/ui/badge";
import { discoverIndonesian } from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isTmdbConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { formatDate, tmdbImage } from "@/lib/utils";
import {
  FAMILY_METRIC_LABELS,
  FAMILY_METRIC_KEYS,
  REACTION_KINDS,
  type FamilyMetricKey,
  type FamilyMetrics,
  type ReactionKind,
  type VibeTag,
} from "@/lib/types";

type FeaturedReview = ReviewCardData & {
  movie: { id: number; tmdbId: number; title: string; poster_path: string | null } | null;
};

export default async function HomePage() {
  const [trending, reviewData] = await Promise.all([
    discoverIndonesian({ sort: "popularity.desc" }),
    loadRecentReviews(),
  ]);
  const { reviews: recentReviews, featured, currentUserId } = reviewData;
  const isLoggedIn = Boolean(currentUserId);

  return (
    <div className="space-y-16">
      <Hero featured={featured} isLoggedIn={isLoggedIn} />

      {(!isSupabaseConfigured() || !isTmdbConfigured()) && <SetupBanner />}

      <section className="space-y-5">
        <SectionHeader title="Lagi rame" href="/movies" linkLabel="Lihat semua" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {trending.slice(0, 12).map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </section>

      {recentReviews.length > 0 && (
        <section className="space-y-5">
          <SectionHeader title="Baru ditulis" />
          <div className="grid gap-3 md:grid-cols-2">
            {recentReviews.map((r) => (
              <ReviewCard key={r.id} review={r} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Hero({ featured, isLoggedIn }: { featured: FeaturedReview | null; isLoggedIn: boolean }) {
  return (
    <section className="grid gap-10 pt-4 md:grid-cols-12 md:gap-12 md:pt-8">
      <div className="md:col-span-6 lg:col-span-5">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
          Catatan film Indonesia
        </p>
        <h1 className="mt-3 font-display text-5xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
          Cek dulu, <em className="font-display italic text-primary">baru&nbsp;nonton.</em>
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
          Rating, kesan, tag dari penonton lain. Aman buat keluarga? Pas buat hujan-hujan? Yang udah nonton bakal kasih tau.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/movies">Cari film</Link>
          </Button>
          {isSupabaseConfigured() && !isLoggedIn && (
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Login pakai Google</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="md:col-span-6 lg:col-span-7">
        {featured ? <FeaturedReviewPanel review={featured} /> : <HeroPosterStack />}
      </div>
    </section>
  );
}

function FeaturedReviewPanel({ review }: { review: FeaturedReview }) {
  const poster = review.movie ? tmdbImage(review.movie.poster_path, "w342") : null;
  const familyEntries = review.family
    ? FAMILY_METRIC_KEYS.flatMap((key) => {
        const val = review.family?.[key as FamilyMetricKey];
        return val ? [{ key, label: FAMILY_METRIC_LABELS[key].label, val }] : [];
      }).slice(0, 3)
    : [];
  const snippet =
    review.review_text && !review.contains_spoiler
      ? review.review_text.length > 220
        ? review.review_text.slice(0, 220).trimEnd() + "…"
        : review.review_text
      : null;

  return (
    <figure className="relative">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-primary/[0.06] blur-2xl" aria-hidden />
      <Link
        href={`/reviews/${review.id}`}
        className="group block rounded-2xl border border-border bg-card/60 p-5 transition-colors hover:border-primary/40 sm:p-6"
      >
        <div className="flex items-start gap-4">
          {poster && review.movie && (
            <div className="relative hidden aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-md border border-border bg-secondary sm:block">
              <Image
                src={poster}
                alt={`Poster ${review.movie.title}`}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Review pilihan</p>
            {review.movie && (
              <h2 className="mt-1 font-display text-2xl leading-tight text-foreground sm:text-3xl">
                {review.movie.title}
              </h2>
            )}
            <div className="mt-2 flex items-center gap-3">
              <StarRating value={review.rating} size="sm" />
              <span className="text-xs text-muted-foreground">
                @{review.author.username} · {formatDate(review.created_at)}
              </span>
            </div>
          </div>
        </div>

        {snippet && (
          <blockquote className="mt-5 font-display text-xl italic leading-snug text-foreground/90 sm:text-2xl">
            “{snippet}”
          </blockquote>
        )}

        {review.vibeTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {review.vibeTags.slice(0, 5).map((vt) => (
              <Badge key={vt.id} variant="secondary" className="font-normal">
                {vt.emoji} {vt.label_id}
              </Badge>
            ))}
          </div>
        )}

        {familyEntries.length > 0 && (
          <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-border pt-4">
            {familyEntries.map(({ key, label, val }) => (
              <div key={key}>
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                <dd className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-2xl text-primary">{val}</span>
                  <span className="text-xs text-muted-foreground">/5</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Link>
    </figure>
  );
}

function HeroPosterStack() {
  return (
    <div className="relative hidden h-64 md:block">
      <p className="font-display text-base italic text-muted-foreground">
        Belum ada review. Jadilah yang pertama menulis kesan tentang film yang baru kamu tonton.
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="font-display text-3xl text-foreground sm:text-4xl">{title}</h2>
      {href && linkLabel && (
        <Link
          href={href}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

async function loadRecentReviews(): Promise<{
  reviews: ReviewCardData[];
  featured: FeaturedReview | null;
  currentUserId: string | null;
}> {
  if (!isSupabaseConfigured()) return { reviews: [], featured: null, currentUserId: null };
  const supabase = await createClient();

  const [{ data: userData }, { data: vibeTags }, { data: reviewRows }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("vibe_tags").select("id, slug, label_id, emoji"),
    supabase
      .from("reviews")
      .select(
        `id, rating, review_text, contains_spoiler, created_at, updated_at, movie_id,
         movie:movies!reviews_movie_id_fkey(id, tmdb_id, title, poster_path),
         author:profiles!reviews_user_id_fkey(username, avatar_url, display_name, is_admin, is_banned),
         family_metrics(*),
         review_vibe_tags(vibe_tag_id)`,
      )
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const currentUserId = userData?.user?.id ?? null;
  const tagById = new Map(((vibeTags as VibeTag[] | null) ?? []).map((vt) => [vt.id, vt]));

  let reviews: ReviewCardData[] = (reviewRows ?? []).map((r: {
    id: string;
    rating: number;
    review_text: string | null;
    contains_spoiler: boolean;
    created_at: string;
    updated_at: string | null;
    movie_id: number;
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
        Object.fromEntries(REACTION_KINDS.map((rk) => [rk.kind, 0])) as Record<ReactionKind, number>,
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

  const featuredCandidate = pickFeatured(reviewRows ?? [], reviews);

  return { reviews, featured: featuredCandidate, currentUserId };
}

function pickFeatured(
  rows: Array<{
    id: string;
    movie:
      | { id: number; tmdb_id: number; title: string; poster_path: string | null }
      | { id: number; tmdb_id: number; title: string; poster_path: string | null }[]
      | null;
  }>,
  reviews: ReviewCardData[],
): FeaturedReview | null {
  if (reviews.length === 0) return null;
  const scored = reviews
    .map((r, i) => {
      const rawMovie = rows[i]?.movie;
      const m = Array.isArray(rawMovie) ? rawMovie[0] : rawMovie;
      return {
        r,
        movie: m
          ? { id: m.id, tmdbId: m.tmdb_id, title: m.title, poster_path: m.poster_path }
          : null,
        score:
          r.rating * 2 +
          (r.review_text && !r.contains_spoiler ? Math.min(r.review_text.length / 80, 4) : 0) +
          r.vibeTags.length * 0.5,
      };
    })
    .filter((x) => x.r.review_text && !x.r.contains_spoiler && x.movie)
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top) return null;
  return { ...top.r, movie: top.movie };
}

function SetupBanner() {
  const needsSupabase = !isSupabaseConfigured();
  const needsTmdb = !isTmdbConfigured();
  return (
    <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
      <p className="font-semibold text-foreground">Setup belum kelar.</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-muted-foreground">
        {needsTmdb && (
          <li>
            <code>TMDB_API_KEY</code> belum ada. Filmnya sekarang dari sampel.
            Tambahin di <code>.env.local</code> buat narik data sungguhan.
          </li>
        )}
        {needsSupabase && (
          <li>
            Supabase belum nyambung. Login dan review nggak jalan sampe{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di-set.
          </li>
        )}
      </ul>
    </div>
  );
}
