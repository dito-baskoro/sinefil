import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

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
        className,
      )}
    >
      <div className="animate-film-loop">
        <LogoMark size="lg" aria-hidden />
      </div>
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}
