"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StarRatingPicker } from "@/components/star-rating-picker";
import { FamilyMetricsSliders, type FamilyMetricsValue } from "@/components/family-metrics-sliders";
import { VibeTagPicker } from "@/components/vibe-tag-picker";
import type { VibeTag } from "@/lib/types";
import { submitReview } from "@/app/movies/[tmdbId]/actions";

export function ReviewDialog({
  movieDbId,
  movieTitle,
  vibeTags,
  triggerLabel = "Tulis Review",
  initial,
}: {
  movieDbId: number;
  movieTitle: string;
  vibeTags: VibeTag[];
  triggerLabel?: string;
  initial?: {
    rating: number;
    reviewText: string | null;
    containsSpoiler: boolean;
    family: FamilyMetricsValue;
    vibeIds: number[];
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [text, setText] = useState(initial?.reviewText ?? "");
  const [spoiler, setSpoiler] = useState(initial?.containsSpoiler ?? false);
  const [family, setFamily] = useState<FamilyMetricsValue>(initial?.family ?? {});
  const [vibeIds, setVibeIds] = useState<number[]>(initial?.vibeIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review {movieTitle}</DialogTitle>
          <DialogDescription>Kasih bintang, tulis kesan, dan opsional: rating keluarga + vibe.</DialogDescription>
        </DialogHeader>

        <form
          action={() => {
            setError(null);
            if (rating < 0.5) {
              setError("Pilih dulu minimal 0.5 bintang.");
              return;
            }
            startTransition(async () => {
              const result = await submitReview({
                movieDbId,
                rating,
                reviewText: text,
                containsSpoiler: spoiler,
                family,
                vibeTagIds: vibeIds,
              });
              if (result?.error) setError(result.error);
              else {
                setOpen(false);
                router.refresh();
              }
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Rating</Label>
            <StarRatingPicker value={rating} onChange={setRating} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review_text">Review (opsional)</Label>
            <Textarea
              id="review_text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Apa kesanmu? Kenapa kasih bintang segitu?"
              maxLength={2000}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{text.length} / 2000</p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label htmlFor="spoiler">Mengandung spoiler</Label>
              <p className="text-xs text-muted-foreground">Teks akan diblur sampai pembaca klik.</p>
            </div>
            <Switch id="spoiler" checked={spoiler} onCheckedChange={setSpoiler} />
          </div>

          <FamilyMetricsSliders value={family} onChange={setFamily} />

          <div className="space-y-2">
            <Label>Vibe tags (opsional)</Label>
            <VibeTagPicker vibeTags={vibeTags} value={vibeIds} onChange={setVibeIds} />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : "Posting Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
