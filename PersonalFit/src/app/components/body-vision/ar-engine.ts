/**
 * BodyVision - AR Liquify/Warp Engine
 *
 * Canvas-based inverse warping that deforms ONLY body regions
 * while keeping the background completely intact.
 * Uses Photoshop-Liquify-style elliptical warp zones with
 * smooth (1-d^2)^2 falloff.
 *
 * Anatomy-based progression: ~1kg per 2 weeks = ~2kg/month
 * = up to 24kg over 12 months of strict diet + sport.
 */

import type { ViewType } from './types';

// ============ Warp Zone Definition ============

interface WarpZone {
  cx: number; cy: number;   // center (0-1 normalized)
  rx: number; ry: number;   // radius (0-1 normalized)
  dx: number; dy: number;   // displacement in pixels
}

export function getWarpZones(view: ViewType, w: number, h: number, progress: number): WarpZone[] {
  const zones: WarpZone[] = [];
  const p = progress;
  if (p <= 0) return zones;

  if (view === 'front') {
    zones.push({ cx: 0.30, cy: 0.52, rx: 0.10, ry: 0.14, dx: w*0.035*p, dy: 0 });
    zones.push({ cx: 0.70, cy: 0.52, rx: 0.10, ry: 0.14, dx: -w*0.035*p, dy: 0 });
    zones.push({ cx: 0.38, cy: 0.54, rx: 0.10, ry: 0.12, dx: w*0.025*p, dy: -h*0.008*p });
    zones.push({ cx: 0.62, cy: 0.54, rx: 0.10, ry: 0.12, dx: -w*0.025*p, dy: -h*0.008*p });
    zones.push({ cx: 0.50, cy: 0.58, rx: 0.14, ry: 0.06, dx: 0, dy: -h*0.015*p });
    zones.push({ cx: 0.26, cy: 0.62, rx: 0.08, ry: 0.10, dx: w*0.03*p, dy: 0 });
    zones.push({ cx: 0.74, cy: 0.62, rx: 0.08, ry: 0.10, dx: -w*0.03*p, dy: 0 });
    const mp = Math.max(0, (p - 0.2) / 0.8);
    zones.push({ cx: 0.40, cy: 0.32, rx: 0.10, ry: 0.06, dx: -w*0.008*mp, dy: -h*0.005*mp });
    zones.push({ cx: 0.60, cy: 0.32, rx: 0.10, ry: 0.06, dx: w*0.008*mp, dy: -h*0.005*mp });
    zones.push({ cx: 0.24, cy: 0.26, rx: 0.07, ry: 0.06, dx: -w*0.012*mp, dy: -h*0.004*mp });
    zones.push({ cx: 0.76, cy: 0.26, rx: 0.07, ry: 0.06, dx: w*0.012*mp, dy: -h*0.004*mp });
    zones.push({ cx: 0.20, cy: 0.36, rx: 0.06, ry: 0.12, dx: w*0.018*p, dy: 0 });
    zones.push({ cx: 0.80, cy: 0.36, rx: 0.06, ry: 0.12, dx: -w*0.018*p, dy: 0 });
    zones.push({ cx: 0.43, cy: 0.13, rx: 0.05, ry: 0.04, dx: w*0.008*p, dy: 0 });
    zones.push({ cx: 0.57, cy: 0.13, rx: 0.05, ry: 0.04, dx: -w*0.008*p, dy: 0 });
    zones.push({ cx: 0.50, cy: 0.16, rx: 0.06, ry: 0.03, dx: 0, dy: -h*0.005*p });
    zones.push({ cx: 0.36, cy: 0.72, rx: 0.07, ry: 0.10, dx: w*0.012*p, dy: 0 });
    zones.push({ cx: 0.64, cy: 0.72, rx: 0.07, ry: 0.10, dx: -w*0.012*p, dy: 0 });
  } else if (view === 'side' || view === 'sideAlt') {
    const dir = view === 'side' ? 1 : -1;
    const bellyX = view === 'side' ? 0.45 : 0.55;
    const backX = view === 'side' ? 0.60 : 0.40;
    const chestX = view === 'side' ? 0.42 : 0.58;
    const chinX = view === 'side' ? 0.44 : 0.56;
    const armX = view === 'side' ? 0.58 : 0.42;
    const buttX = view === 'side' ? 0.58 : 0.42;
    zones.push({ cx: bellyX, cy: 0.52, rx: 0.12, ry: 0.14, dx: dir*w*0.04*p, dy: -h*0.008*p });
    zones.push({ cx: bellyX, cy: 0.58, rx: 0.10, ry: 0.08, dx: dir*w*0.035*p, dy: -h*0.01*p });
    zones.push({ cx: backX, cy: 0.45, rx: 0.08, ry: 0.12, dx: -dir*w*0.015*p, dy: 0 });
    const mp = Math.max(0, (p - 0.2) / 0.8);
    zones.push({ cx: chestX, cy: 0.32, rx: 0.10, ry: 0.07, dx: -dir*w*0.01*mp, dy: -h*0.008*mp });
    zones.push({ cx: chinX, cy: 0.15, rx: 0.06, ry: 0.04, dx: dir*w*0.012*p, dy: -h*0.005*p });
    zones.push({ cx: armX, cy: 0.34, rx: 0.06, ry: 0.12, dx: -dir*w*0.01*p, dy: 0 });
    zones.push({ cx: buttX, cy: 0.63, rx: 0.08, ry: 0.06, dx: 0, dy: -h*0.01*p });
    zones.push({ cx: 0.50, cy: 0.72, rx: 0.10, ry: 0.10, dx: dir*w*0.008*p, dy: 0 });
  } else {
    zones.push({ cx: 0.28, cy: 0.48, rx: 0.10, ry: 0.14, dx: w*0.035*p, dy: 0 });
    zones.push({ cx: 0.72, cy: 0.48, rx: 0.10, ry: 0.14, dx: -w*0.035*p, dy: 0 });
    zones.push({ cx: 0.30, cy: 0.55, rx: 0.08, ry: 0.10, dx: w*0.025*p, dy: 0 });
    zones.push({ cx: 0.70, cy: 0.55, rx: 0.08, ry: 0.10, dx: -w*0.025*p, dy: 0 });
    zones.push({ cx: 0.26, cy: 0.62, rx: 0.08, ry: 0.08, dx: w*0.025*p, dy: 0 });
    zones.push({ cx: 0.74, cy: 0.62, rx: 0.08, ry: 0.08, dx: -w*0.025*p, dy: 0 });
    const mp = Math.max(0, (p - 0.2) / 0.8);
    zones.push({ cx: 0.24, cy: 0.26, rx: 0.07, ry: 0.06, dx: -w*0.01*mp, dy: 0 });
    zones.push({ cx: 0.76, cy: 0.26, rx: 0.07, ry: 0.06, dx: w*0.01*mp, dy: 0 });
    zones.push({ cx: 0.18, cy: 0.36, rx: 0.06, ry: 0.12, dx: w*0.015*p, dy: 0 });
    zones.push({ cx: 0.82, cy: 0.36, rx: 0.06, ry: 0.12, dx: -w*0.015*p, dy: 0 });
    zones.push({ cx: 0.38, cy: 0.72, rx: 0.07, ry: 0.10, dx: w*0.008*p, dy: 0 });
    zones.push({ cx: 0.62, cy: 0.72, rx: 0.07, ry: 0.10, dx: -w*0.008*p, dy: 0 });
  }
  return zones;
}

// ============ Bilinear Interpolation ============

function bilinearSample(src: Uint8ClampedArray, w: number, x: number, y: number, h: number): [number, number, number, number] {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1);
  const fx = x - x0, fy = y - y0;
  const cx0 = Math.max(0, x0), cy0 = Math.max(0, y0);
  const i00 = (cy0 * w + cx0) * 4, i10 = (cy0 * w + x1) * 4;
  const i01 = (y1 * w + cx0) * 4, i11 = (y1 * w + x1) * 4;
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
  return [
    src[i00]*w00 + src[i10]*w10 + src[i01]*w01 + src[i11]*w11,
    src[i00+1]*w00 + src[i10+1]*w10 + src[i01+1]*w01 + src[i11+1]*w11,
    src[i00+2]*w00 + src[i10+2]*w10 + src[i01+2]*w01 + src[i11+2]*w11,
    src[i00+3]*w00 + src[i10+3]*w10 + src[i01+3]*w01 + src[i11+3]*w11,
  ];
}

// ============ Core Liquify Warp ============

function applyLiquifyWarp(srcData: ImageData, dstData: ImageData, zones: WarpZone[], w: number, h: number) {
  const src = srcData.data, dst = dstData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let totalDx = 0, totalDy = 0;
      const nx = x / w, ny = y / h;
      for (const z of zones) {
        const ex = (nx - z.cx) / z.rx, ey = (ny - z.cy) / z.ry;
        const d2 = ex * ex + ey * ey;
        if (d2 >= 1) continue;
        const falloff = (1 - d2) * (1 - d2);
        totalDx += z.dx * falloff;
        totalDy += z.dy * falloff;
      }
      const idx = (y * w + x) * 4;
      if (totalDx === 0 && totalDy === 0) {
        dst[idx] = src[idx]; dst[idx+1] = src[idx+1];
        dst[idx+2] = src[idx+2]; dst[idx+3] = src[idx+3];
      } else {
        const sx = Math.max(0, Math.min(w - 1, x + totalDx));
        const sy = Math.max(0, Math.min(h - 1, y + totalDy));
        const [r, g, b, a] = bilinearSample(src, w, sx, sy, h);
        dst[idx] = r; dst[idx+1] = g; dst[idx+2] = b; dst[idx+3] = a;
      }
    }
  }
}

// ============ Public API ============

/** Full pipeline: load image -> warp body -> color grade -> return data URL
 *  @param progress - 0 to 1 warp intensity from prediction engine (overrides months-based calculation if provided)
 */
export function processBodyTransform(
  imageSrc: string,
  view: ViewType,
  months: number,
  maxSize = 800,
  externalProgress?: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      // Use external progress from prediction engine if provided, otherwise fall back to time-based curve
      const progress = externalProgress !== undefined
        ? Math.max(0, Math.min(1, externalProgress))
        : (() => { const t = months / 12; return 1 - Math.pow(1 - t, 2.2); })();
      const zones = getWarpZones(view, w, h, progress);

      if (zones.length > 0) {
        const srcData = ctx.getImageData(0, 0, w, h);
        const dstData = ctx.createImageData(w, h);
        applyLiquifyWarp(srcData, dstData, zones, w, h);
        ctx.putImageData(dstData, 0, 0);
      }

      const contrast = 1 + progress * 0.18;
      const brightness = 1 + progress * 0.04;
      const saturate = 1 + progress * 0.12;
      const canvas2 = document.createElement('canvas');
      canvas2.width = w; canvas2.height = h;
      const ctx2 = canvas2.getContext('2d')!;
      ctx2.filter = `contrast(${contrast}) brightness(${brightness}) saturate(${saturate})`;
      ctx2.drawImage(canvas, 0, 0);

      resolve(canvas2.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/** Muscle definition CSS gradient overlays (on top of warped canvas)
 *  @param externalProgress - 0 to 1, overrides months-based calculation
 */
export function getDefinitionOverlays(months: number, view: ViewType, externalProgress?: number): string[] {
  const p = externalProgress !== undefined
    ? Math.max(0, Math.min(1, externalProgress))
    : (() => { const t = months / 12; return 1 - Math.pow(1 - t, 2.2); })();
  const layers: string[] = [];
  const mp = Math.max(0, (p - 0.25) / 0.75);

  if (view === 'front' && mp > 0) {
    layers.push(`linear-gradient(to right, transparent 48.5%, rgba(0,0,0,${mp*0.15}) 49.5%, rgba(0,0,0,${mp*0.15}) 50.5%, transparent 51.5%)`);
    layers.push(`radial-gradient(ellipse 18% 1.5% at 50% 42%, rgba(0,0,0,${mp*0.12}) 0%, transparent 100%)`);
    layers.push(`radial-gradient(ellipse 16% 1.5% at 50% 46%, rgba(0,0,0,${mp*0.11}) 0%, transparent 100%)`);
    layers.push(`radial-gradient(ellipse 14% 1.5% at 50% 50%, rgba(0,0,0,${mp*0.1}) 0%, transparent 100%)`);
    layers.push(`radial-gradient(ellipse 16% 2.5% at 40% 37%, rgba(0,0,0,${mp*0.14}) 0%, transparent 100%)`);
    layers.push(`radial-gradient(ellipse 16% 2.5% at 60% 37%, rgba(0,0,0,${mp*0.14}) 0%, transparent 100%)`);
    layers.push(`radial-gradient(ellipse 8% 6% at 28% 26%, rgba(200,230,255,${mp*0.08}) 0%, transparent 100%)`);
    layers.push(`radial-gradient(ellipse 8% 6% at 72% 26%, rgba(200,230,255,${mp*0.08}) 0%, transparent 100%)`);
  } else if (view === 'back' && mp > 0) {
    layers.push(`linear-gradient(to right, transparent 48%, rgba(0,0,0,${mp*0.1}) 49.5%, rgba(0,0,0,${mp*0.1}) 50.5%, transparent 52%)`);
    layers.push(`radial-gradient(ellipse 15% 18% at 35% 38%, rgba(0,0,0,${mp*0.08}) 0%, transparent 100%)`);
    layers.push(`radial-gradient(ellipse 15% 18% at 65% 38%, rgba(0,0,0,${mp*0.08}) 0%, transparent 100%)`);
    layers.push(`radial-gradient(ellipse 10% 6% at 30% 24%, rgba(180,210,255,${mp*0.06}) 0%, transparent 100%)`);
    layers.push(`radial-gradient(ellipse 10% 6% at 70% 24%, rgba(180,210,255,${mp*0.06}) 0%, transparent 100%)`);
  }
  return layers;
}