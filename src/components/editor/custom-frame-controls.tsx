"use client";
import * as React from "react";
import { Upload } from "lucide-react";
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
import { DEVICE_LABEL } from "@/lib/constants";
import { DEFAULT_FRAME_SCREEN, readImageSize } from "@/lib/custom-frames";
import { nid } from "@/lib/defaults";
import { fileToDataUrl, uploadDataUrl } from "@/lib/upload-image";
import type { CustomDeviceFrame, Device, ElementTransform } from "@/lib/types";

type Props = {
  device: Device;
  customFrames: CustomDeviceFrame[];
  customFrameId?: string;
  onCustomFramesChange: (frames: CustomDeviceFrame[]) => void;
  onTransformPatch: (patch: Partial<ElementTransform>) => void;
};

export function CustomFrameControls({
  device,
  customFrames,
  customFrameId,
  onCustomFramesChange,
  onTransformPatch,
}: Props) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const activeFrame = customFrameId
    ? customFrames.find((frame) => frame.id === customFrameId)
    : undefined;

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const { width, height } = await readImageSize(dataUrl);
      const path = await uploadDataUrl(dataUrl, "frame");
      if (!path) return;
      const frame: CustomDeviceFrame = {
        id: nid(),
        name: file.name.replace(/\.[^.]+$/, "") || "Custom frame",
        src: path,
        width,
        height,
        screen: { ...DEFAULT_FRAME_SCREEN },
      };
      onCustomFramesChange([...customFrames, frame]);
      onTransformPatch({ customFrameId: frame.id });
    } finally {
      setUploading(false);
    }
  }

  function patchActiveScreen(patch: Partial<CustomDeviceFrame["screen"]>) {
    if (!activeFrame) return;
    onCustomFramesChange(
      customFrames.map((frame) =>
        frame.id === activeFrame.id
          ? { ...frame, screen: { ...frame.screen, ...patch } }
          : frame,
      ),
    );
  }

  function deleteActiveFrame() {
    if (!activeFrame) return;
    onCustomFramesChange(customFrames.filter((frame) => frame.id !== activeFrame.id));
    onTransformPatch({ customFrameId: undefined });
  }

  return (
    <div className="space-y-2 rounded border bg-muted/30 p-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Frame shell</Label>
        <Select
          value={customFrameId || "__builtin__"}
          onValueChange={(value) => {
            if (value === "__upload__") {
              fileRef.current?.click();
              return;
            }
            onTransformPatch({
              customFrameId: value === "__builtin__" ? undefined : value,
            });
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__builtin__">Built-in ({DEVICE_LABEL[device]})</SelectItem>
            {customFrames.map((frame) => (
              <SelectItem key={frame.id} value={frame.id}>
                {frame.name}
              </SelectItem>
            ))}
            <SelectItem value="__upload__">Upload custom frame…</SelectItem>
          </SelectContent>
        </Select>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleUpload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-full text-[10px]"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mr-1 h-3 w-3" />
          {uploading ? "Uploading…" : "Upload frame PNG"}
        </Button>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Use a PNG with a transparent or black screen hole. Adjust the cutout below so the
          screenshot lines up with your frame.
        </p>
      </div>

      {activeFrame ? (
        <>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Frame name</Label>
            <Input
              value={activeFrame.name}
              className="h-8 text-xs"
              onChange={(event) =>
                onCustomFramesChange(
                  customFrames.map((frame) =>
                    frame.id === activeFrame.id
                      ? { ...frame, name: event.target.value }
                      : frame,
                  ),
                )
              }
            />
          </div>
          {(
            [
              ["Left inset", "L", 0, 40],
              ["Top inset", "T", 0, 40],
              ["Screen width", "W", 20, 100],
              ["Screen height", "H", 20, 100],
              ["Corner radius X", "RX", 0, 50],
              ["Corner radius Y", "RY", 0, 50],
            ] as const
          ).map(([label, key, min, max]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{label}</span>
                <span className="tabular-nums">
                  {(activeFrame.screen[key] ?? DEFAULT_FRAME_SCREEN[key] ?? 0).toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={0.5}
                value={activeFrame.screen[key] ?? DEFAULT_FRAME_SCREEN[key] ?? 0}
                onChange={(event) =>
                  patchActiveScreen({ [key]: Number(event.target.value) })
                }
                className="w-full"
                aria-label={label}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full text-[10px] text-destructive hover:text-destructive"
            onClick={deleteActiveFrame}
          >
            Remove custom frame
          </Button>
        </>
      ) : null}
    </div>
  );
}
