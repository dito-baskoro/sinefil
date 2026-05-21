import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Read-only star rating display. For interactive picking see <StarRatingPicker>.
 * `value` is 0–5 in 0.5 increments.
 */
export function StarRating({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };
  const cls = sizes[size];
  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= 5; i++) {
    const filled = value >= i;
    const half = !filled && value >= i - 0.5;
    if (filled) {
      stars.push(<Star key={i} className={cn(cls, "fill-yellow-400 text-yellow-400")} />);
    } else if (half) {
      stars.push(
        <span key={i} className={cn(cls, "relative inline-block")}>
          <Star className={cn(cls, "absolute inset-0 text-yellow-400/40")} />
          <StarHalf className={cn(cls, "absolute inset-0 fill-yellow-400 text-yellow-400")} />
        </span>
      );
    } else {
      stars.push(<Star key={i} className={cn(cls, "text-muted-foreground/40")} />);
    }
  }
  return <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`Rating ${value} dari 5`}>{stars}</span>;
}
