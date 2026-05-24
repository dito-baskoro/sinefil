"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, MessageSquare } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { Badge } from "@/components/ui/badge";
import { DefaultAvatar } from "@/components/default-avatar";
import { cn, formatDate } from "@/lib/utils";
import type { FamilyMetricKey, FamilyMetrics, ReactionKind, VibeTag } from "@/lib/types";
import { FAMILY_METRIC_LABELS, FAMILY_METRIC_KEYS, REACTION_KINDS } from "@/lib/types";
import { ReactionBar } from "@/app/reviews/[id]/reaction-bar";

export type ReviewCardData = {
  id: string;
  rating: number;
  review_text: string | null;
  contains_spoiler: boolean;
  created_at: string;
  updated_at?: string | null;
  author: { username: string; avatar_url: string | null; display_name: string | null; is_admin?: boolean; is_banned?: boolean };
  family: FamilyMetrics | null;
  vibeTags: VibeTag[];
  reactionCounts?: Record<ReactionKind, number>;
  activeReactions?: ReactionKind[];
  commentCount?: number;
};

export function ReviewCard({
  review,
  isLoggedIn = false,
}: {
  review: ReviewCardData;
  isLoggedIn?: boolean;
}) {
  const [revealed, setRevealed] = useState(!review.contains_spoiler);
  const counts =
    review.reactionCounts ??
    (Object.fromEntries(REACTION_KINDS.map((r) => [r.kind, 0])) as Record<ReactionKind, number>);
  const commentCount = review.commentCount ?? 0;

  return (
    <article className="rounded-md border border-border bg-card p-4">
      <header className="flex items-start gap-3">
        <Link href={`/profile/${review.author.username}`} className="shrink-0">
          <div className="h-9 w-9 overflow-hidden rounded-full border border-[rgb(102,119,136)]">
            {review.author.avatar_url ? (
              <Image
                src={review.author.avatar_url}
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
        </Link>
        <div className="flex-1 space-y-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link href={`/profile/${review.author.username}`} className="text-sm font-semibold hover:underline">
              {review.author.display_name || review.author.username}
            </Link>
            {review.author.is_admin && (
              <Badge variant="default" className="h-4 px-1.5 text-[10px] font-medium">
                Admin
              </Badge>
            )}
            {review.author.is_banned && (
              <Badge variant="destructive" className="h-4 px-1.5 text-[10px] font-medium">
                Banned
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              @{review.author.username} · {formatDate(review.created_at)}
              {review.updated_at &&
                new Date(review.updated_at).getTime() - new Date(review.created_at).getTime() > 1000 && (
                  <span title={`Diedit ${formatDate(review.updated_at)}`}> · diedit</span>
                )}
            </span>
          </div>
          <StarRating value={review.rating} size="sm" />
        </div>
      </header>

      {review.review_text && (
        <div className="mt-3">
          <p
            className={cn(
              "whitespace-pre-wrap text-sm leading-relaxed",
              !revealed && "blur-md select-none"
            )}
          >
            {review.review_text}
          </p>
          {review.contains_spoiler && (
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {revealed ? (
                <>
                  <EyeOff className="h-3 w-3" /> Sembunyikan spoiler
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" /> Tampilkan spoiler
                </>
              )}
            </button>
          )}
        </div>
      )}

      {review.vibeTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {review.vibeTags.map((vt) => (
            <Badge key={vt.id} variant="secondary" className="font-normal">
              {vt.emoji} {vt.label_id}
            </Badge>
          ))}
        </div>
      )}

      {review.family && hasAnyFamilyValue(review.family) && (
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-border bg-secondary/30 p-3 sm:grid-cols-2">
          {FAMILY_METRIC_KEYS.map((key) => {
            const val = review.family?.[key as FamilyMetricKey] ?? null;
            if (val === null) return null;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{FAMILY_METRIC_LABELS[key].label}</span>
                  <span className="tabular-nums text-muted-foreground">{val}/5</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(val / 5) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ReactionBar
          reviewId={review.id}
          initialCounts={counts}
          initialActive={review.activeReactions ?? []}
          isLoggedIn={isLoggedIn}
        />
        <Link
          href={`/reviews/${review.id}`}
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {commentCount} komentar
        </Link>
      </div>
    </article>
  );
}

function hasAnyFamilyValue(f: FamilyMetrics): boolean {
  return FAMILY_METRIC_KEYS.some((k) => f[k] !== null && f[k] !== undefined);
}
