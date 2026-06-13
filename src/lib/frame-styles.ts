import type { CSSProperties } from "react";
import type { DeviceFrameStyle } from "./types";

export const DEVICE_FRAME_STYLE_LABEL: Record<DeviceFrameStyle, string> = {
  flat: "Flat (front)",
  "tilt-left": "3D · tilt left",
  "tilt-right": "3D · tilt right",
  "perspective-left": "3D · perspective left",
  "perspective-right": "3D · perspective right",
  "lay-flat": "3D · lay flat",
  float: "3D · floating",
};

export function frameStyleCss(style: DeviceFrameStyle | undefined): CSSProperties {
  switch (style) {
    case "tilt-left":
      return {
        transform: "rotateY(14deg) rotateX(3deg)",
        transformStyle: "preserve-3d",
        filter: "drop-shadow(-12px 24px 36px rgba(0,0,0,0.42))",
      };
    case "tilt-right":
      return {
        transform: "rotateY(-14deg) rotateX(3deg)",
        transformStyle: "preserve-3d",
        filter: "drop-shadow(12px 24px 36px rgba(0,0,0,0.42))",
      };
    case "perspective-left":
      return {
        transform: "rotateY(26deg) rotateX(8deg) rotateZ(-1.5deg)",
        transformStyle: "preserve-3d",
        filter: "drop-shadow(-18px 32px 48px rgba(0,0,0,0.5))",
      };
    case "perspective-right":
      return {
        transform: "rotateY(-26deg) rotateX(8deg) rotateZ(1.5deg)",
        transformStyle: "preserve-3d",
        filter: "drop-shadow(18px 32px 48px rgba(0,0,0,0.5))",
      };
    case "lay-flat":
      return {
        transform: "rotateX(58deg) scale(0.9)",
        transformOrigin: "center 88%",
        transformStyle: "preserve-3d",
        filter: "drop-shadow(0 28px 40px rgba(0,0,0,0.55))",
      };
    case "float":
      return {
        transform: "rotateY(-10deg) rotateX(5deg) translateY(-3%)",
        transformStyle: "preserve-3d",
        filter: "drop-shadow(0 36px 56px rgba(0,0,0,0.48))",
      };
    case "flat":
    default:
      return {
        filter: "drop-shadow(0 28px 56px rgba(0,0,0,0.45))",
      };
  }
}

export function framePerspectiveWrapper(style: DeviceFrameStyle | undefined): CSSProperties {
  if (!style || style === "flat") return {};
  return {
    perspective: "1400px",
    perspectiveOrigin: "50% 42%",
    width: "100%",
    height: "100%",
  };
}
