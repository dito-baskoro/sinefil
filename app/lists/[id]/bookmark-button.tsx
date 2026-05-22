"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleListBookmark } from "../actions";

export function BookmarkListButton({
  listId,
  initialBookmarked,
  initialCount,
  isLoggedIn,
}: {
  listId: string;
  initialBookmarked: boolean;
  initialCount: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
        🔖 Simpan
      </Button>
    );
  }

  return (
    <Button
      variant={bookmarked ? "default" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const optimistic = !bookmarked;
          setBookmarked(optimistic);
          setCount((c) => c + (optimistic ? 1 : -1));
          const result = await toggleListBookmark(listId);
          if (result.error) {
            setBookmarked(!optimistic);
            setCount((c) => c + (optimistic ? -1 : 1));
            return;
          }
          const next = result.bookmarked ?? optimistic;
          setBookmarked(next);
          router.refresh();
        })
      }
    >
      🔖 {bookmarked ? "Tersimpan" : "Simpan"}
      {count > 0 && (
        <span className="ml-1 tabular-nums text-muted-foreground">· {count}</span>
      )}
    </Button>
  );
}
