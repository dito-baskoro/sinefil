"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteReview } from "@/app/movies/[tmdbId]/actions";

export function DeleteReviewButton({
  reviewId,
  redirectTo,
  label = "Hapus review",
}: {
  reviewId: string;
  redirectTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Hapus review ini? Reaksi & komentar ikut kehapus.")) return;
        startTransition(async () => {
          const result = await deleteReview(reviewId);
          if (result.error) {
            alert(result.error);
            return;
          }
          if (redirectTo) router.push(redirectTo);
          else router.refresh();
        });
      }}
    >
      {pending ? "Menghapus..." : label}
    </Button>
  );
}
