"use client";

import { Toggle } from "@/components/ui/toggle";
import type { VibeTag } from "@/lib/types";

export function VibeTagPicker({
  vibeTags,
  value,
  onChange,
  name = "vibe_tag_ids",
}: {
  vibeTags: VibeTag[];
  value: number[];
  onChange: (v: number[]) => void;
  name?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {vibeTags.map((vt) => {
          const active = value.includes(vt.id);
          return (
            <Toggle
              key={vt.id}
              size="sm"
              variant="outline"
              pressed={active}
              onPressedChange={(pressed) => {
                if (pressed) onChange([...value, vt.id]);
                else onChange(value.filter((id) => id !== vt.id));
              }}
            >
              {vt.emoji ? <span className="mr-1">{vt.emoji}</span> : null}
              {vt.label_id}
            </Toggle>
          );
        })}
      </div>
      <input type="hidden" name={name} value={value.join(",")} />
    </div>
  );
}
