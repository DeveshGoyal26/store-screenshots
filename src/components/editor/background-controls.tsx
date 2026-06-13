"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Slide, SlideBackground, Theme } from "@/lib/types";

const PATTERN_LABELS = {
  none: "None",
  dots: "Dot grid",
  grid: "Line grid",
  diagonal: "Diagonal lines",
} as const;

type Props = {
  slide: Slide;
  theme: Theme;
  onChange: (patch: Partial<Slide>) => void;
  onAddOrganicShapes?: () => void;
};

export function BackgroundControls({ slide, theme, onChange, onAddOrganicShapes }: Props) {
  const bg: SlideBackground = slide.background || {};
  const mode = bg.mode ?? "theme";

  function patchBackground(patch: Partial<SlideBackground>) {
    onChange({ background: { ...bg, ...patch } });
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div>
        <Label className="text-xs font-semibold">Background</Label>
        <p className="text-[10px] text-muted-foreground">Customize fill, pattern, and glow per screen.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Fill</Label>
        <Select
          value={mode}
          onValueChange={(value) =>
            patchBackground({
              mode: value as SlideBackground["mode"],
              ...(value === "theme"
                ? {}
                : {
                    color: bg.color || theme.bg,
                    colorEnd: bg.colorEnd || theme.accent,
                  }),
            })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="theme">Theme gradient</SelectItem>
            <SelectItem value="solid">Solid color</SelectItem>
            <SelectItem value="gradient">Custom gradient</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={!!slide.inverted}
          onChange={(e) => onChange({ inverted: e.target.checked || undefined })}
        />
        Dark / inverted variant
      </label>

      {mode !== "theme" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              {mode === "gradient" ? "Start" : "Color"}
            </Label>
            <Input
              type="color"
              value={bg.color || theme.bg}
              className="h-9 p-1"
              onChange={(e) => patchBackground({ color: e.target.value })}
            />
          </div>
          {mode === "gradient" && (
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">End</Label>
              <Input
                type="color"
                value={bg.colorEnd || theme.accent}
                className="h-9 p-1"
                onChange={(e) => patchBackground({ colorEnd: e.target.value })}
              />
            </div>
          )}
        </div>
      )}

      {mode === "gradient" && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Angle</span>
            <span className="tabular-nums">{bg.angle ?? 160}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={bg.angle ?? 160}
            onChange={(e) => patchBackground({ angle: Number(e.target.value) })}
            className="w-full"
            aria-label="Gradient angle"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Pattern overlay</Label>
        <Select
          value={bg.pattern ?? "none"}
          onValueChange={(value) =>
            patchBackground({ pattern: value as SlideBackground["pattern"] })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PATTERN_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(bg.pattern ?? "none") !== "none" && (
        <>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Pattern color</Label>
            <Input
              type="color"
              value={bg.patternColor || "#ffffff"}
              className="h-9 p-1"
              onChange={(e) => patchBackground({ patternColor: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Pattern opacity</span>
              <span className="tabular-nums">{Math.round((bg.patternOpacity ?? 0.35) * 100)}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={Math.round((bg.patternOpacity ?? 0.35) * 100)}
              onChange={(e) =>
                patchBackground({ patternOpacity: Number(e.target.value) / 100 })
              }
              className="w-full"
              aria-label="Pattern opacity"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{bg.pattern === "dots" ? "Dot spacing" : "Pattern scale"}</span>
              <span className="tabular-nums">{(bg.patternSize ?? 1.26).toFixed(1)}×</span>
            </div>
            <input
              type="range"
              min={25}
              max={300}
              value={Math.round((bg.patternSize ?? 1.26) * 100)}
              onChange={(e) =>
                patchBackground({ patternSize: Number(e.target.value) / 100 })
              }
              className="w-full"
              aria-label={bg.pattern === "dots" ? "Dot spacing" : "Pattern scale"}
            />
          </div>
          {bg.pattern === "dots" && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Dot size</span>
                <span className="tabular-nums">{(bg.patternDotSize ?? 1).toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min={25}
                max={300}
                value={Math.round((bg.patternDotSize ?? 1) * 100)}
                onChange={(e) =>
                  patchBackground({ patternDotSize: Number(e.target.value) / 100 })
                }
                className="w-full"
                aria-label="Dot size"
              />
            </div>
          )}
        </>
      )}

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={bg.glow !== false}
          onChange={(e) => patchBackground({ glow: e.target.checked })}
        />
        Accent glow blobs
      </label>

      {onAddOrganicShapes ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full text-xs"
          onClick={onAddOrganicShapes}
        >
          Add organic shapes (App Mockup style)
        </Button>
      ) : null}
    </div>
  );
}
