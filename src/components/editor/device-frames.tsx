"use client";
import * as React from "react";
import {
  ANDROID_SCREEN,
  GAME_ANDROID_SCREEN,
  GAME_IPHONE_SCREEN,
  PHONE_SCREEN,
} from "@/lib/constants";
import { framePerspectiveWrapper, frameStyleCss } from "@/lib/frame-styles";
import { img } from "@/lib/image-cache";
import {
  mergedFit,
  screenshotHas3d,
  screenshotImageTransform,
} from "@/lib/screenshot-fit";
import {
  clampPan,
  panAxisGuide,
  snapPan,
  type PanAxisGuide,
} from "@/lib/screenshot-align";
import type { DeviceFrameStyle, FrameScreenInset, ScreenshotAlign, ScreenshotFit } from "@/lib/types";
import { CenterAlignmentGuides } from "./center-alignment-guides";

function fitObjectPosition(align: ScreenshotAlign): string {
  switch (align) {
    case "center":
      return "center center";
    case "bottom":
      return "bottom center";
    default:
      return "top center";
  }
}

type FrameProps = {
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  hideEmpty?: boolean;
  frameStyle?: DeviceFrameStyle;
  screenshotFit?: ScreenshotFit;
  /** When true, drag inside the screen pans; scroll zooms. */
  adjustScreenshot?: boolean;
  onScreenshotFitChange?: (fit: ScreenshotFit) => void;
};

function FrameShell({
  frameStyle,
  style,
  children,
}: {
  frameStyle?: DeviceFrameStyle;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const perspective = framePerspectiveWrapper(frameStyle);
  const frameCss = frameStyleCss(frameStyle);
  const hasPerspective = Object.keys(perspective).length > 0;

  if (!hasPerspective) {
    return (
      <div style={{ width: "100%", height: "100%", ...frameCss, ...style }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ ...perspective, ...style }}>
      <div style={{ width: "100%", height: "100%", ...frameCss }}>
        {children}
      </div>
    </div>
  );
}

function ScreenContent({
  src,
  alt,
  hideEmpty,
  fit,
  adjustScreenshot,
  onScreenshotFitChange,
}: {
  src: string;
  alt: string;
  hideEmpty?: boolean;
  fit: Required<ScreenshotFit>;
  adjustScreenshot?: boolean;
  onScreenshotFitChange?: (fit: ScreenshotFit) => void;
}) {
  const resolved = img(src);
  const objectFit = fit.mode;
  const objectPosition = fitObjectPosition(fit.align);
  const needsTransform =
    fit.scale !== 1 ||
    fit.offsetX !== 0 ||
    fit.offsetY !== 0 ||
    screenshotHas3d(fit);
  const use3d = screenshotHas3d(fit);
  const [dragGuides, setDragGuides] = React.useState<{ x: PanAxisGuide; y: PanAxisGuide }>({
    x: null,
    y: null,
  });
  const idleGuides = React.useMemo(
    () => ({
      x: adjustScreenshot ? panAxisGuide(fit.offsetX) : null,
      y: adjustScreenshot ? panAxisGuide(fit.offsetY) : null,
    }),
    [adjustScreenshot, fit.offsetX, fit.offsetY],
  );
  const guides = dragGuides.x || dragGuides.y ? dragGuides : idleGuides;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!adjustScreenshot || !onScreenshotFitChange) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startFit = { ...fit };

    const onMove = (event: PointerEvent) => {
      const dx = ((event.clientX - startX) / rect.width) * 100;
      const dy = ((event.clientY - startY) / rect.height) * 100;
      const rawX = clampPan(startFit.offsetX + dx);
      const rawY = clampPan(startFit.offsetY + dy);
      const nextX = snapPan(rawX);
      const nextY = snapPan(rawY);
      setDragGuides({ x: panAxisGuide(nextX), y: panAxisGuide(nextY) });
      onScreenshotFitChange({
        ...startFit,
        offsetX: nextX,
        offsetY: nextY,
      });
    };

    const onUp = () => {
      setDragGuides({ x: null, y: null });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!adjustScreenshot || !onScreenshotFitChange) return;
    e.stopPropagation();
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    onScreenshotFitChange({
      ...fit,
      scale: Math.max(0.5, Math.min(3, fit.scale * (1 + delta))),
    });
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        cursor: adjustScreenshot ? "grab" : "default",
        touchAction: adjustScreenshot ? "none" : undefined,
        pointerEvents: adjustScreenshot ? "auto" : "none",
      }}
    >
      {resolved ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            perspective: use3d ? `${fit.perspective}px` : undefined,
            transformStyle: use3d ? "preserve-3d" : undefined,
          }}
        >
          <img
            src={resolved}
            alt={alt}
            draggable={false}
            style={{
              position: "absolute",
              ...(needsTransform
                ? {
                    left: "50%",
                    top: "50%",
                    width: "100%",
                    height: "100%",
                    transform: screenshotImageTransform(fit),
                    transformOrigin: "center center",
                    transformStyle: use3d ? "preserve-3d" : undefined,
                  }
                : {
                    inset: 0,
                    width: "100%",
                    height: "100%",
                  }),
              objectFit,
              objectPosition,
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        </div>
      ) : hideEmpty ? null : (
        <EmptySlot />
      )}
      {adjustScreenshot ? (
        <>
          <CenterAlignmentGuides x={guides.x} y={guides.y} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "2px dashed rgba(99,102,241,0.75)",
              background: "rgba(99,102,241,0.08)",
              pointerEvents: "none",
              boxSizing: "border-box",
            }}
          />
        </>
      ) : null}
    </div>
  );
}

// iPhone — uses pre-measured mockup.png overlay
export function Phone({
  src,
  alt = "",
  style,
  hideEmpty,
  frameStyle = "flat",
  screenshotFit,
  adjustScreenshot,
  onScreenshotFitChange,
}: FrameProps) {
  const fit = mergedFit(screenshotFit);
  return (
    <FrameShell
      frameStyle={frameStyle}
      style={{ position: "relative", aspectRatio: "1022 / 2082", ...style }}
    >
      <img
        src={img("/mockup.png")}
        alt=""
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
        draggable={false}
      />
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          overflow: "hidden",
          left: `${PHONE_SCREEN.L}%`,
          top: `${PHONE_SCREEN.T}%`,
          width: `${PHONE_SCREEN.W}%`,
          height: `${PHONE_SCREEN.H}%`,
          borderRadius: `${PHONE_SCREEN.RX}% / ${PHONE_SCREEN.RY}%`,
          background: "#111",
        }}
      >
        <ScreenContent
          src={src}
          alt={alt}
          hideEmpty={hideEmpty}
          fit={fit}
          adjustScreenshot={adjustScreenshot}
          onScreenshotFitChange={onScreenshotFitChange}
        />
      </div>
    </FrameShell>
  );
}

export function AndroidPhone({
  src,
  alt = "",
  style,
  hideEmpty,
  frameStyle = "flat",
  screenshotFit,
  adjustScreenshot,
  onScreenshotFitChange,
}: FrameProps) {
  const fit = mergedFit(screenshotFit);
  return (
    <FrameShell
      frameStyle={frameStyle}
      style={{ position: "relative", aspectRatio: "1220 / 2712", ...style }}
    >
      <img
        src={img("/android-mockup.png")}
        alt=""
        style={{ display: "block", width: "100%", height: "100%", pointerEvents: "none" }}
        draggable={false}
      />
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          overflow: "hidden",
          left: `${ANDROID_SCREEN.L}%`,
          top: `${ANDROID_SCREEN.T}%`,
          width: `${ANDROID_SCREEN.W}%`,
          height: `${ANDROID_SCREEN.H}%`,
          borderRadius: `${ANDROID_SCREEN.RX}% / ${ANDROID_SCREEN.RY}%`,
          background: "#000",
        }}
      >
        <ScreenContent
          src={src}
          alt={alt}
          hideEmpty={hideEmpty}
          fit={fit}
          adjustScreenshot={adjustScreenshot}
          onScreenshotFitChange={onScreenshotFitChange}
        />
      </div>
    </FrameShell>
  );
}

type CustomFrameProps = FrameProps & {
  frameSrc: string;
  frameWidth: number;
  frameHeight: number;
  screen: FrameScreenInset;
};

function ScreenHole({
  screen,
  src,
  alt,
  hideEmpty,
  fit,
  adjustScreenshot,
  onScreenshotFitChange,
}: {
  screen: FrameScreenInset;
  src: string;
  alt: string;
  hideEmpty?: boolean;
  fit: Required<ScreenshotFit>;
  adjustScreenshot?: boolean;
  onScreenshotFitChange?: (fit: ScreenshotFit) => void;
}) {
  const rx = screen.RX ?? 0;
  const ry = screen.RY ?? 0;
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 10,
        overflow: "hidden",
        left: `${screen.L}%`,
        top: `${screen.T}%`,
        width: `${screen.W}%`,
        height: `${screen.H}%`,
        borderRadius: `${rx}% / ${ry}%`,
        background: "#111",
      }}
    >
      <ScreenContent
        src={src}
        alt={alt}
        hideEmpty={hideEmpty}
        fit={fit}
        adjustScreenshot={adjustScreenshot}
        onScreenshotFitChange={onScreenshotFitChange}
      />
    </div>
  );
}

/** User-uploaded device frame PNG with configurable screen cutout. */
export function CustomPhone({
  frameSrc,
  frameWidth,
  frameHeight,
  screen,
  src,
  alt = "",
  style,
  hideEmpty,
  frameStyle = "flat",
  screenshotFit,
  adjustScreenshot,
  onScreenshotFitChange,
}: CustomFrameProps) {
  const fit = mergedFit(screenshotFit);
  const resolvedFrame = img(frameSrc);
  return (
    <FrameShell
      frameStyle={frameStyle}
      style={{ position: "relative", aspectRatio: `${frameWidth} / ${frameHeight}`, ...style }}
    >
      {resolvedFrame ? (
        <img
          src={resolvedFrame}
          alt=""
          style={{ display: "block", width: "100%", height: "100%", pointerEvents: "none" }}
          draggable={false}
        />
      ) : null}
      <ScreenHole
        screen={screen}
        src={src}
        alt={alt}
        hideEmpty={hideEmpty}
        fit={fit}
        adjustScreenshot={adjustScreenshot}
        onScreenshotFitChange={onScreenshotFitChange}
      />
    </FrameShell>
  );
}

export function AndroidTabletP({
  src,
  alt = "",
  style,
  hideEmpty,
  frameStyle = "flat",
  screenshotFit,
  adjustScreenshot,
  onScreenshotFitChange,
}: FrameProps) {
  const fit = mergedFit(screenshotFit);
  return (
    <FrameShell
      frameStyle={frameStyle}
      style={{ position: "relative", aspectRatio: "5 / 8", ...style }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "4.5% / 2.8%",
          background: "linear-gradient(160deg, #2a2a2e 0%, #18181b 100%)",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 48px rgba(0,0,0,0.6)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "1.2%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "1.4%",
            height: "0.88%",
            borderRadius: "50%",
            background: "#0d0d0f",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "3.5%",
            top: "2.2%",
            width: "93%",
            height: "95.6%",
            borderRadius: "2.5% / 1.6%",
            overflow: "hidden",
            background: "#000",
          }}
        >
          <ScreenContent
            src={src}
            alt={alt}
            hideEmpty={hideEmpty}
            fit={fit}
            adjustScreenshot={adjustScreenshot}
            onScreenshotFitChange={onScreenshotFitChange}
          />
        </div>
      </div>
    </FrameShell>
  );
}

export function AndroidTabletL({
  src,
  alt = "",
  style,
  hideEmpty,
  frameStyle = "flat",
  screenshotFit,
  adjustScreenshot,
  onScreenshotFitChange,
}: FrameProps) {
  const fit = mergedFit(screenshotFit);
  return (
    <FrameShell
      frameStyle={frameStyle}
      style={{ position: "relative", aspectRatio: "8 / 5", ...style }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "2.8% / 4.5%",
          background: "linear-gradient(160deg, #2a2a2e 0%, #18181b 100%)",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 48px rgba(0,0,0,0.6)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "1.2%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "0.88%",
            height: "1.4%",
            borderRadius: "50%",
            background: "#0d0d0f",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "2.2%",
            top: "3.5%",
            width: "95.6%",
            height: "93%",
            borderRadius: "1.6% / 2.5%",
            overflow: "hidden",
            background: "#000",
          }}
        >
          <ScreenContent
            src={src}
            alt={alt}
            hideEmpty={hideEmpty}
            fit={fit}
            adjustScreenshot={adjustScreenshot}
            onScreenshotFitChange={onScreenshotFitChange}
          />
        </div>
      </div>
    </FrameShell>
  );
}

export function IPad({
  src,
  alt = "",
  style,
  hideEmpty,
  frameStyle = "flat",
  screenshotFit,
  adjustScreenshot,
  onScreenshotFitChange,
}: FrameProps) {
  const fit = mergedFit(screenshotFit);
  return (
    <FrameShell
      frameStyle={frameStyle}
      style={{ position: "relative", aspectRatio: "770 / 1000", ...style }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "5% / 3.6%",
          background: "linear-gradient(180deg, #2C2C2E 0%, #1C1C1E 100%)",
          position: "relative",
          overflow: "hidden",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "1.2%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "0.9%",
            height: "0.65%",
            borderRadius: "50%",
            background: "#111113",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "4%",
            top: "2.8%",
            width: "92%",
            height: "94.4%",
            borderRadius: "2.2% / 1.6%",
            overflow: "hidden",
            background: "#000",
          }}
        >
          <ScreenContent
            src={src}
            alt={alt}
            hideEmpty={hideEmpty}
            fit={fit}
            adjustScreenshot={adjustScreenshot}
            onScreenshotFitChange={onScreenshotFitChange}
          />
        </div>
      </div>
    </FrameShell>
  );
}

/** Landscape iPhone bezel for game store screenshots (2868×1320 canvas). */
export function GameIphoneLandscape({
  src,
  alt = "",
  style,
  hideEmpty,
  frameStyle = "flat",
  screenshotFit,
  adjustScreenshot,
  onScreenshotFitChange,
}: FrameProps) {
  const fit = mergedFit(screenshotFit);
  const s = GAME_IPHONE_SCREEN;
  return (
    <FrameShell
      frameStyle={frameStyle}
      style={{ position: "relative", aspectRatio: "2868 / 1320", ...style }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "3.2% / 6.8%",
          background: "linear-gradient(180deg, #3a3a3c 0%, #1c1c1e 100%)",
          position: "relative",
          overflow: "hidden",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.12), 0 12px 48px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "1.4%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "1.1%",
            height: "4.2%",
            borderRadius: "999px",
            background: "#0a0a0a",
            zIndex: 20,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${s.L}%`,
            top: `${s.T}%`,
            width: `${s.W}%`,
            height: `${s.H}%`,
            borderRadius: `${s.RX}% / ${s.RY}%`,
            overflow: "hidden",
            background: "#000",
          }}
        >
          <ScreenContent
            src={src}
            alt={alt}
            hideEmpty={hideEmpty}
            fit={fit}
            adjustScreenshot={adjustScreenshot}
            onScreenshotFitChange={onScreenshotFitChange}
          />
        </div>
      </div>
    </FrameShell>
  );
}

/** Landscape Android bezel for game store screenshots (1920×1080 canvas). */
export function GameAndroidLandscape({
  src,
  alt = "",
  style,
  hideEmpty,
  frameStyle = "flat",
  screenshotFit,
  adjustScreenshot,
  onScreenshotFitChange,
}: FrameProps) {
  const fit = mergedFit(screenshotFit);
  const s = GAME_ANDROID_SCREEN;
  return (
    <FrameShell
      frameStyle={frameStyle}
      style={{ position: "relative", aspectRatio: "16 / 9", ...style }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "2.8% / 5%",
          background: "linear-gradient(160deg, #2a2a2e 0%, #18181b 100%)",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.08), 0 10px 40px rgba(0,0,0,0.6)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "2.5%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "1.6%",
            height: "2.8%",
            borderRadius: "50%",
            background: "#0d0d0f",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${s.L}%`,
            top: `${s.T}%`,
            width: `${s.W}%`,
            height: `${s.H}%`,
            borderRadius: `${s.RX}% / ${s.RY}%`,
            overflow: "hidden",
            background: "#000",
          }}
        >
          <ScreenContent
            src={src}
            alt={alt}
            hideEmpty={hideEmpty}
            fit={fit}
            adjustScreenshot={adjustScreenshot}
            onScreenshotFitChange={onScreenshotFitChange}
          />
        </div>
      </div>
    </FrameShell>
  );
}

function EmptySlot() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.4)",
        fontSize: "min(2vw, 14px)",
        background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
        textAlign: "center",
        padding: "4%",
      }}
    >
      Drop a screenshot here
    </div>
  );
}
