"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Interactive star picker — 0.5 to 5.0 in 0.5 increments.
 * Each visible star is split into left (.5) and right (full) halves.
 */
export function StarRatingPicker({
  value,
  onChange,
  size = "lg",
  name,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "md" | "lg";
  name?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const sizes = { md: "h-5 w-5", lg: "h-7 w-7" };
  const cls = sizes[size];

  return (
    <div className="inline-flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => {
        const fullVal = i;
        const halfVal = i - 0.5;
        const isFull = display >= fullVal;
        const isHalf = !isFull && display >= halfVal;
        return (
          <span key={i} className="relative inline-flex">
            <button
              type="button"
              className={cn(cls, "relative")}
              onMouseEnter={() => setHover(halfVal)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onChange(halfVal)}
              aria-label={`${halfVal} bintang`}
            >
              <Star
                className={cn(
                  cls,
                  "absolute inset-0 transition-colors",
                  isHalf ? "fill-yellow-400 text-yellow-400" : isFull ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"
                )}
                style={isHalf ? { clipPath: "inset(0 50% 0 0)" } : undefined}
              />
              {isFull && (
                <Star className={cn(cls, "absolute inset-0 fill-yellow-400 text-yellow-400")} />
              )}
            </button>
            <button
              type="button"
              className={cn(cls, "absolute inset-0 left-1/2 w-1/2")}
              onMouseEnter={() => setHover(fullVal)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onChange(fullVal)}
              aria-label={`${fullVal} bintang`}
            />
          </span>
        );
      })}
      <span className="ml-2 min-w-[2.5rem] text-sm font-medium text-muted-foreground tabular-nums">
        {display.toFixed(1)} / 5
      </span>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
