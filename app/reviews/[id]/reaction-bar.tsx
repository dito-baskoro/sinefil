"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { REACTION_KINDS, type ReactionKind } from "@/lib/types";
import { toggleReaction } from "./actions";

export function ReactionBar({
  reviewId,
  initialCounts,
  initialActive,
  isLoggedIn,
}: {
  reviewId: string;
  initialCounts: Record<ReactionKind, number>;
  initialActive: ReactionKind[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState(initialCounts);
  const [active, setActive] = useState(new Set(initialActive));
  const [pending, startTransition] = useTransition();

  function onClick(kind: ReactionKind) {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    const wasActive = active.has(kind);
    const nextActive = new Set(active);
    if (wasActive) nextActive.delete(kind);
    else nextActive.add(kind);
    setActive(nextActive);
    setCounts({ ...counts, [kind]: counts[kind] + (wasActive ? -1 : 1) });

    startTransition(async () => {
      const result = await toggleReaction(reviewId, kind);
      if (result.error) {
        setActive(active);
        setCounts(counts);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {REACTION_KINDS.map((r) => {
        const isActive = active.has(r.kind);
        return (
          <button
            key={r.kind}
            type="button"
            disabled={pending}
            onClick={() => onClick(r.kind)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
              isActive
                ? "border-primary bg-primary/10 text-foreground"
                : "border-input hover:bg-secondary"
            }`}
            aria-pressed={isActive}
            title={r.label}
          >
            <span>{r.emoji}</span>
            <span className="text-xs">{r.label}</span>
            <span className="tabular-nums text-xs text-muted-foreground">
              {counts[r.kind]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
