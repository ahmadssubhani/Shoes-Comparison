"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shows a shoe photo on a dark panel, edge to edge.
 * Store photos have a white backdrop, so we load the image through Next's own
 * /_next/image route (same origin, so the canvas stays readable), flood-fill the
 * white backdrop from the edges to transparent, crop to the shoe and scale it up
 * to fill the card. If the photo has a coloured backdrop (corners are not near-white)
 * it is simply shown full-bleed instead.
 */
export function HeroShoe({ src, alt }: { src: string; alt: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"loading" | "cutout" | "plain">("loading");

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      try {
        const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const work = document.createElement("canvas");
        work.width = w;
        work.height = h;
        const ctx = work.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(img, 0, 0, w, h);
        const frame = ctx.getImageData(0, 0, w, h);
        const px = frame.data;

        const LIGHT = 236; // a pixel counts as backdrop when R, G and B are all >= this
        const isLight = (i: number) => px[i] >= LIGHT && px[i + 1] >= LIGHT && px[i + 2] >= LIGHT;

        // Only cut out when the four corners are near-white.
        const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
        if (!corners.every(isLight)) {
          setMode("plain");
          return;
        }

        // Flood fill from every border pixel through connected light pixels.
        const seen = new Uint8Array(w * h);
        const stack: number[] = [];
        const push = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= w || y >= h) return;
          const p = y * w + x;
          if (seen[p] || !isLight(p * 4)) return;
          seen[p] = 1;
          stack.push(p);
        };
        for (let x = 0; x < w; x++) {
          push(x, 0);
          push(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          push(0, y);
          push(w - 1, y);
        }
        while (stack.length) {
          const p = stack.pop() as number;
          const x = p % w;
          const y = (p - x) / w;
          push(x + 1, y);
          push(x - 1, y);
          push(x, y + 1);
          push(x, y - 1);
        }

        // Backdrop -> transparent; soften the one-pixel rim so edges are not jagged.
        let minX = w, minY = h, maxX = 0, maxY = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const p = y * w + x;
            if (seen[p]) {
              px[p * 4 + 3] = 0;
              continue;
            }
            const nearBackdrop =
              (x > 0 && seen[p - 1]) || (x < w - 1 && seen[p + 1]) || (y > 0 && seen[p - w]) || (y < h - 1 && seen[p + w]);
            if (nearBackdrop) {
              const lum = (px[p * 4] + px[p * 4 + 1] + px[p * 4 + 2]) / 3;
              px[p * 4 + 3] = lum > 215 ? 90 : 190;
            }
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
        if (maxX <= minX || maxY <= minY) {
          setMode("plain");
          return;
        }
        ctx.putImageData(frame, 0, 0);

        // Crop to the shoe so it fills the card whatever the photo's margins were.
        const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.02);
        const sx = Math.max(0, minX - pad);
        const sy = Math.max(0, minY - pad);
        const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2);
        const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2);
        const out = canvasRef.current;
        if (!out) return;
        out.width = sw;
        out.height = sh;
        out.getContext("2d")?.drawImage(work, sx, sy, sw, sh, 0, 0, sw, sh);
        setMode("cutout");
      } catch {
        if (!cancelled) setMode("plain");
      }
    };
    img.onerror = () => {
      if (!cancelled) setMode("plain");
    };
    img.src = `/_next/image?url=${encodeURIComponent(src)}&w=1080&q=75`;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        className={`absolute inset-0 m-auto h-[88%] w-[92%] object-contain drop-shadow-[0_24px_28px_rgba(0,0,0,0.55)] transition-all duration-500 group-hover:scale-105 ${
          mode === "cutout" ? "opacity-100" : "opacity-0"
        }`}
      />
      {mode === "plain" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
    </>
  );
}