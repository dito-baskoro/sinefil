import Link from "next/link";
import { MovieCard } from "@/components/movie-card";
import { ReviewCard, type ReviewCardData } from "@/components/review-card";
import { discoverIndonesian } from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isTmdbConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { REACTION_KINDS, type FamilyMetrics, type ReactionKind, type VibeTag } from "@/lib/types";

export default async function HomePage() {
  const trending = await discoverIndonesian({ sort: "popularity.desc" });
  const { reviews: recentReviews, currentUserId } = await loadRecentReviews();
  const isLoggedIn = Boolean(currentUserId);

  return (
    <div className="space-y-12">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Platform film Indonesia
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Catat film yang udah ditonton, kasih bintang, baca review penonton lain.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild>
            <Link href="/movies">Cari film</Link>
          </Button>
          {isSupabaseConfigured() && !isLoggedIn && (
            <Button asChild variant="outline">
              <Link href="/login">Login pakai Google</Link>
            </Button>
          )}
        </div>
      </section>

      {(!isSupabaseConfigured() || !isTmdbConfigured()) && <SetupBanner />}

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Lagi rame</h2>
          <Link href="/movies" className="text-sm text-muted-foreground hover:text-foreground">
            Lihat semua →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {trending.slice(0, 12).map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </section>

      {recentReviews.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold">Baru ditulis</h2>
          </div>
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

async function loadRecentReviews(): Promise<{ reviews: ReviewCardData[]; currentUserId: string | null }> {
  if (!isSupabaseConfigured()) return { reviews: [], currentUserId: null };
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const { data: vibeTags } = await supabase.from("vibe_tags").select("id, slug, label_id, emoji");
  const tagById = new Map(((vibeTags as VibeTag[] | null) ?? []).map((vt) => [vt.id, vt]));

  const { data } = await supabase
    .from("reviews")
    .select(
      `id, rating, review_text, contains_spoiler, created_at, updated_at,
       author:profiles!reviews_user_id_fkey(username, avatar_url, display_name, is_admin),
       family_metrics(*),
       review_vibe_tags(vibe_tag_id)`
    )
    .order("created_at", { ascending: false })
    .limit(12);

  let reviews: ReviewCardData[] = (data ?? []).map((r: {
    id: string;
    rating: number;
    review_text: string | null;
    contains_spoiler: boolean;
    created_at: string;
    updated_at: string | null;
    author: { username: string; avatar_url: string | null; display_name: string | null; is_admin: boolean } | { username: string; avatar_url: string | null; display_name: string | null; is_admin: boolean }[] | null;
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
      author: author ?? { username: "?", avatar_url: null, display_name: null, is_admin: false },
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

  return { reviews, currentUserId };
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
