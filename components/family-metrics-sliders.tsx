"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FAMILY_METRIC_KEYS, FAMILY_METRIC_LABELS, type FamilyMetricKey } from "@/lib/types";

export type FamilyMetricsValue = Partial<Record<FamilyMetricKey, number>>;

/**
 * Five-slider input for "Aman Ditonton Bareng Keluarga?". Each slider is
 * optional — value 0 means "skip" and won't be saved.
 */
export function FamilyMetricsSliders({
  value,
  onChange,
  name = "family_metrics",
}: {
  value: FamilyMetricsValue;
  onChange: (v: FamilyMetricsValue) => void;
  name?: string;
}) {
  const [open, setOpen] = useState(Object.values(value).some((v) => (v ?? 0) > 0));

  return (
    <div className="rounded-md border border-border bg-secondary/30 p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-semibold"
      >
        <span>Aman Ditonton Bareng Keluarga? 🇮🇩</span>
        <span className="text-xs text-muted-foreground">{open ? "Tutup" : "Buka"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          {FAMILY_METRIC_KEYS.map((key) => (
            <FamilyMetricSlider
              key={key}
              metricKey={key}
              value={value[key] ?? 0}
              onChange={(v) => onChange({ ...value, [key]: v })}
            />
          ))}
          <p className="text-xs text-muted-foreground">
            Geser ke 0 untuk skip. Cuma yang kamu isi yang akan disimpan.
          </p>
        </div>
      )}
      <input type="hidden" name={name} value={JSON.stringify(stripEmpty(value))} />
    </div>
  );
}

function stripEmpty(v: FamilyMetricsValue): FamilyMetricsValue {
  const out: FamilyMetricsValue = {};
  for (const k of FAMILY_METRIC_KEYS) {
    const n = v[k];
    if (typeof n === "number" && n >= 1 && n <= 5) out[k] = n;
  }
  return out;
}

function FamilyMetricSlider({
  metricKey,
  value,
  onChange,
}: {
  metricKey: FamilyMetricKey;
  value: number;
  onChange: (v: number) => void;
}) {
  const { label, help } = FAMILY_METRIC_LABELS[metricKey];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value === 0 ? "—" : value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={5}
        step={1}
        onValueChange={(arr) => onChange(arr[0] ?? 0)}
      />
      <p className="text-[11px] leading-tight text-muted-foreground">{help}</p>
    </div>
  );
}
