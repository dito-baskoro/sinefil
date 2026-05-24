import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

const SIZE: Record<LogoSize, { mark: string; text: string; gap: string }> = {
  sm: { mark: "h-5 w-5", text: "text-base", gap: "gap-1.5" },
  md: { mark: "h-7 w-7", text: "text-xl", gap: "gap-2" },
  lg: { mark: "h-12 w-12", text: "text-4xl", gap: "gap-3" },
};

export function LogoMark({
  size = "md",
  className,
  ...props
}: { size?: LogoSize } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden
      className={cn(SIZE[size].mark, "text-primary", className)}
      {...props}
    >
      <rect x="1" y="1" width="22" height="22" rx="5" fill="currentColor" />
      <path
        d="M16.8 7.2 C 14.4 6.2, 9.6 6.4, 8.4 9 C 7.4 11.4, 12.2 11.6, 14.6 12.6 C 17 13.6, 15.6 16.8, 12 17 C 9.6 17.1, 7.6 16.4, 6.6 15.4"
        stroke="oklch(0.18 0.012 120)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function LogoWordmark({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-display italic leading-none text-foreground",
        SIZE[size].text,
        className,
      )}
    >
      <span className="text-primary">Sine</span>fil
    </span>
  );
}

export function Logo({
  size = "md",
  href = "/",
  className,
  label = "Sinefil, ke beranda",
}: {
  size?: LogoSize;
  href?: string | null;
  className?: string;
  label?: string;
}) {
  const inner = (
    <>
      <LogoMark size={size} />
      <LogoWordmark size={size} />
    </>
  );

  if (href === null) {
    return (
      <span
        className={cn("inline-flex items-center", SIZE[size].gap, className)}
        aria-label={label}
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        SIZE[size].gap,
        className,
      )}
    >
      {inner}
    </Link>
  );
}
