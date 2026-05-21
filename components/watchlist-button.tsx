"use client";

import { useTransition } from "react";
import { Bookmark, BookmarkCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleWatchlist } from "@/app/movies/[tmdbId]/actions";
import type { WatchlistStatus } from "@/lib/types";

export function WatchlistButton({
  movieDbId,
  current,
}: {
  movieDbId: number;
  current: WatchlistStatus | null;
}) {
  const [pending, startTransition] = useTransition();

  function go(next: WatchlistStatus | null) {
    startTransition(async () => {
      await toggleWatchlist({ movieDbId, desiredStatus: next });
    });
  }

  if (current === "watched") {
    return (
      <Button variant="secondary" disabled={pending} onClick={() => go(null)}>
        <Check className="h-4 w-4" />
        Sudah ditonton
      </Button>
    );
  }

  if (current === "want_to_watch") {
    return (
      <div className="flex gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => go("watched")}>
          <Check className="h-4 w-4" />
          Tandai sudah ditonton
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => go(null)}>
          Hapus
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" disabled={pending} onClick={() => go("want_to_watch")}>
        <Bookmark className="h-4 w-4" />
        Mau nonton
      </Button>
      <Button variant="outline" disabled={pending} onClick={() => go("watched")}>
        <BookmarkCheck className="h-4 w-4" />
        Sudah ditonton
      </Button>
    </div>
  );
}
