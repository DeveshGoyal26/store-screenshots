"use client";
import { Label } from "@/components/ui/label";
import { DEFAULT_FIT, mergedFit } from "@/lib/screenshot-fit";
import type { ScreenshotFit } from "@/lib/types";

type Props = {
  fit: ScreenshotFit | undefined;
  onScreenshotFitChange: (fit: ScreenshotFit) => void;
};

function FitSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {value.toFixed(step < 1 ? 1 : 0)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
        aria-label={label}
      />
    </div>
  );
}

export function Screenshot3dControls({ fit: rawFit, onScreenshotFitChange }: Props) {
  const fit = mergedFit(rawFit);
  const patch = (partial: Partial<ScreenshotFit>) =>
    onScreenshotFitChange({ ...fit, ...partial });

  return (
    <div className="space-y-2 rounded border border-dashed bg-muted/20 p-2">
      <Label className="text-[11px] text-muted-foreground">3D stretch</Label>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Tilt and skew the screenshot inside the screen cutout to match perspective frames.
      </p>
      <FitSlider
        label="Tilt X (top/bottom)"
        value={fit.rotateX}
        min={-45}
        max={45}
        onChange={(rotateX) => patch({ rotateX })}
      />
      <FitSlider
        label="Tilt Y (left/right)"
        value={fit.rotateY}
        min={-45}
        max={45}
        onChange={(rotateY) => patch({ rotateY })}
      />
      <FitSlider
        label="Rotate Z"
        value={fit.rotateZ}
        min={-45}
        max={45}
        onChange={(rotateZ) => patch({ rotateZ })}
      />
      <FitSlider
        label="Skew X"
        value={fit.skewX}
        min={-30}
        max={30}
        onChange={(skewX) => patch({ skewX })}
      />
      <FitSlider
        label="Skew Y"
        value={fit.skewY}
        min={-30}
        max={30}
        onChange={(skewY) => patch({ skewY })}
      />
      <FitSlider
        label="Perspective"
        value={fit.perspective}
        min={300}
        max={1600}
        step={10}
        suffix="px"
        onChange={(perspective) => patch({ perspective })}
      />
      <button
        type="button"
        className="h-7 w-full rounded-md border bg-background text-[10px] hover:bg-muted"
        onClick={() =>
          onScreenshotFitChange({
            ...fit,
            rotateX: DEFAULT_FIT.rotateX,
            rotateY: DEFAULT_FIT.rotateY,
            rotateZ: DEFAULT_FIT.rotateZ,
            skewX: DEFAULT_FIT.skewX,
            skewY: DEFAULT_FIT.skewY,
            perspective: DEFAULT_FIT.perspective,
          })
        }
      >
        Reset 3D stretch
      </button>
    </div>
  );
}
