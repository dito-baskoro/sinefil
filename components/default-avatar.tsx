import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Default avatar shown when a profile has no avatar_url. Matches the Sinefil
 * logo: Film icon on the brand orange. Fills its parent — wrap it in a sized
 * container (e.g. `h-8 w-8`).
 */
export function DefaultAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground",
        className
      )}
    >
      <Film className="h-1/2 w-1/2" strokeWidth={2.2} aria-hidden />
    </span>
  );
}
