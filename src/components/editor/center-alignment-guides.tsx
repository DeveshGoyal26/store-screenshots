"use client";
import type { PanAxisGuide } from "@/lib/screenshot-align";

export function CenterAlignmentGuides({
  x,
  y,
}: {
  x: PanAxisGuide;
  y: PanAxisGuide;
}) {
  if (!x && !y) return null;

  const line = (axis: "x" | "y", state: PanAxisGuide) => {
    if (!state) return null;
    const snapped = state === "snapped";
    const color = snapped ? "#6366f1" : "rgba(99,102,241,0.45)";
    const width = snapped ? 2 : 1;
    if (axis === "x") {
      return (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width,
            transform: "translateX(-50%)",
            background: color,
            pointerEvents: "none",
            zIndex: 30,
            boxShadow: snapped ? "0 0 6px rgba(99,102,241,0.65)" : undefined,
          }}
        />
      );
    }
    return (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: width,
          transform: "translateY(-50%)",
          background: color,
          pointerEvents: "none",
          zIndex: 30,
          boxShadow: snapped ? "0 0 6px rgba(99,102,241,0.65)" : undefined,
        }}
      />
    );
  };

  return (
    <>
      {line("x", x)}
      {line("y", y)}
      {x === "snapped" && y === "snapped" ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            padding: "2px 6px",
            borderRadius: 4,
            background: "rgba(99,102,241,0.92)",
            color: "#fff",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            pointerEvents: "none",
            zIndex: 31,
            whiteSpace: "nowrap",
          }}
        >
          Centered
        </div>
      ) : null}
    </>
  );
}
