import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Branded loading state: Film + "Sinefil" wordmark pulsing in unison.
 * Used as the root `app/loading.tsx` and reusable inside any section.
 */
export function Loading({
  label,
  fullPage = false,
  className,
}: {
  label?: string;
  fullPage?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label ?? "Memuat"}
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullPage ? "min-h-[60vh]" : "py-12",
        className
      )}
    >
      <div className="animate-film-loop text-primary">
        <Film className="h-8 w-8" strokeWidth={2.5} aria-hidden />
      </div>
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}
