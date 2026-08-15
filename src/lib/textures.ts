/**
 * Every texture in the scene is painted with the 2D canvas API at runtime.
 *
 * Nothing is fetched. A promo page whose first impression is a spinner has
 * already lost, and a handful of `<canvas>` draws costs microseconds against
 * the hundreds of kilobytes an equivalent set of PNGs would have cost. It also
 * means the labels stay crisp at any device pixel ratio and can be re-tinted
 * from the same palette the app itself uses.
 *
 * Results are cached by key: the scene mounts once and never needs a second
 * copy of the same label.
 */

import { CanvasTexture, LinearFilter, SRGBColorSpace, type Texture } from 'three';

const cache = new Map<string, Texture>();

export const PALETTE = {
  bg: '#0B1220',
  surface: '#111A2E',
  card: '#16213A',
  border: '#233252',
  text: '#F2F6FF',
  dim: '#8FA3C8',
  faint: '#5D7099',
  primary: '#22C55E',
  sky: '#0EA5E9',
  accent: '#38BDF8',
  protein: '#38BDF8',
  carbs: '#FBBF24',
  fat: '#F472B6',
  water: '#38BDF8',
  steps: '#A78BFA',
  onPrimary: '#062B12',
} as const;

const FONT = '"Inter", "Segoe UI", system-ui, sans-serif';

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { canvas, ctx };
}

function finish(key: string, canvas: HTMLCanvasElement): Texture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}

function cached(key: string, draw: () => HTMLCanvasElement): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  return finish(key, draw());
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Soft radial falloff, drawn once and reused by every additive glow sprite. */
export function glowTexture(): Texture {
  return cached('glow', () => {
    const size = 256;
    const { canvas, ctx } = makeCanvas(size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  });
}

/** A single round dot with a soft edge — friend pins, particles, data motes. */
export function dotTexture(): Texture {
  return cached('dot', () => {
    const size = 128;
    const { canvas, ctx } = makeCanvas(size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  });
}

/** The brand mark: gradient disc, white N. Used on avatar pins and the loader. */
export function logoTexture(): Texture {
  return cached('logo', () => {
    const size = 256;
    const { canvas, ctx } = makeCanvas(size, size);
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, PALETTE.primary);
    g.addColorStop(1, PALETTE.sky);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${size * 0.62}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', size / 2, size * 0.54);
    return canvas;
  });
}

export interface MacroCardSpec {
  key: string;
  label: string;
  value: string;
  unit: string;
  color: string;
  /** 0→1 fill shown on the card's progress bar. */
  fill: number;
}

/**
 * A floating nutrient card — the 3D echo of the dashboard rings in the app.
 * Drawn at 2× the on-screen size so the type stays sharp when a card swings
 * close to the camera.
 */
export function macroCardTexture(spec: MacroCardSpec): Texture {
  return cached(`macro:${spec.key}`, () => {
    const w = 512;
    const h = 320;
    const { canvas, ctx } = makeCanvas(w, h);

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, 'rgba(24,37,67,0.96)');
    bg.addColorStop(1, 'rgba(18,27,49,0.96)');
    ctx.fillStyle = bg;
    roundRect(ctx, 6, 6, w - 12, h - 12, 42);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 3;
    roundRect(ctx, 6, 6, w - 12, h - 12, 42);
    ctx.stroke();

    // Accent rail down the left edge — the app's card idiom.
    ctx.fillStyle = spec.color;
    roundRect(ctx, 6, 40, 10, h - 80, 6);
    ctx.fill();

    ctx.fillStyle = spec.color;
    ctx.font = `700 34px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(spec.label.toUpperCase(), 48, 84);

    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 104px ${FONT}`;
    ctx.fillText(spec.value, 44, 196);

    const valueWidth = ctx.measureText(spec.value).width;
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `600 36px ${FONT}`;
    ctx.fillText(spec.unit, 56 + valueWidth, 196);

    // Progress rail
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 44, 236, w - 88, 18, 9);
    ctx.fill();
    ctx.fillStyle = spec.color;
    roundRect(ctx, 44, 236, (w - 88) * Math.max(0.04, spec.fill), 18, 9);
    ctx.fill();

    return canvas;
  });
}

/** Standard EAN-13-looking bars. Purely decorative — no real code encoded. */
export function barcodeTexture(): Texture {
  return cached('barcode', () => {
    const w = 512;
    const h = 512;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = '#F4F7FF';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#0B1220';
    let x = 56;
    // Deterministic widths: a fixed pattern reads as a barcode, while random
    // ones flicker between renders and look like noise.
    const widths = [6, 3, 10, 4, 6, 14, 3, 8, 4, 12, 6, 3, 9, 5, 7, 11, 4, 6, 3, 10, 5, 8];
    for (let i = 0; i < widths.length && x < w - 56; i++) {
      const bar = widths[i];
      ctx.fillRect(x, 96, bar, 300);
      x += bar + (i % 3 === 0 ? 12 : 7);
    }

    ctx.fillStyle = '#0B1220';
    ctx.font = `600 40px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('5 941234 567890', w / 2, 456);
    return canvas;
  });
}

type TileGlyph = 'dumbbell' | 'chef' | 'calculator' | 'book' | 'flask' | 'bowl';

function drawGlyph(ctx: CanvasRenderingContext2D, glyph: TileGlyph, cx: number, cy: number, s: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = s * 0.09;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (glyph) {
    case 'dumbbell': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, 0);
      ctx.lineTo(s * 0.42, 0);
      ctx.stroke();
      for (const sign of [-1, 1]) {
        roundRect(ctx, sign * s * 0.5 - s * 0.09, -s * 0.3, s * 0.18, s * 0.6, s * 0.07);
        ctx.fill();
        roundRect(ctx, sign * s * 0.3 - s * 0.07, -s * 0.2, s * 0.14, s * 0.4, s * 0.06);
        ctx.fill();
      }
      break;
    }
    case 'chef': {
      ctx.beginPath();
      ctx.arc(-s * 0.24, -s * 0.12, s * 0.24, 0, Math.PI * 2);
      ctx.arc(s * 0.24, -s * 0.12, s * 0.24, 0, Math.PI * 2);
      ctx.arc(0, -s * 0.26, s * 0.27, 0, Math.PI * 2);
      ctx.fill();
      roundRect(ctx, -s * 0.34, s * 0.02, s * 0.68, s * 0.34, s * 0.08);
      ctx.fill();
      break;
    }
    case 'calculator': {
      roundRect(ctx, -s * 0.34, -s * 0.44, s * 0.68, s * 0.88, s * 0.12);
      ctx.stroke();
      roundRect(ctx, -s * 0.22, -s * 0.34, s * 0.44, s * 0.2, s * 0.05);
      ctx.fill();
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          ctx.beginPath();
          ctx.arc(-s * 0.18 + col * s * 0.18, s * 0.0 + row * s * 0.16, s * 0.045, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'book': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.34);
      ctx.lineTo(0, s * 0.36);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.3);
      ctx.quadraticCurveTo(-s * 0.2, -s * 0.42, 0, -s * 0.34);
      ctx.lineTo(0, s * 0.36);
      ctx.quadraticCurveTo(-s * 0.2, s * 0.26, -s * 0.4, s * 0.34);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.4, -s * 0.3);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.42, 0, -s * 0.34);
      ctx.lineTo(0, s * 0.36);
      ctx.quadraticCurveTo(s * 0.2, s * 0.26, s * 0.4, s * 0.34);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'flask': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.14, -s * 0.4);
      ctx.lineTo(-s * 0.14, -s * 0.06);
      ctx.lineTo(-s * 0.38, s * 0.34);
      ctx.quadraticCurveTo(-s * 0.42, s * 0.44, -s * 0.3, s * 0.44);
      ctx.lineTo(s * 0.3, s * 0.44);
      ctx.quadraticCurveTo(s * 0.42, s * 0.44, s * 0.38, s * 0.34);
      ctx.lineTo(s * 0.14, -s * 0.06);
      ctx.lineTo(s * 0.14, -s * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.24, -s * 0.4);
      ctx.lineTo(s * 0.24, -s * 0.4);
      ctx.stroke();
      break;
    }
    case 'bowl': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, -s * 0.06);
      ctx.quadraticCurveTo(0, s * 0.52, s * 0.42, -s * 0.06);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.46, -s * 0.06);
      ctx.lineTo(s * 0.46, -s * 0.06);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.16, -s * 0.26, s * 0.1, 0, Math.PI * 2);
      ctx.arc(s * 0.14, -s * 0.24, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

export interface TileSpec {
  key: string;
  title: string;
  caption: string;
  glyph: TileGlyph;
  from: string;
  to: string;
}

/** One face of the Explore cluster: gradient panel, glyph, title, caption. */
export function tileTexture(spec: TileSpec): Texture {
  return cached(`tile:${spec.key}`, () => {
    const size = 512;
    const { canvas, ctx } = makeCanvas(size, size);

    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, spec.from);
    g.addColorStop(1, spec.to);
    ctx.fillStyle = g;
    roundRect(ctx, 8, 8, size - 16, size - 16, 64);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 4;
    roundRect(ctx, 8, 8, size - 16, size - 16, 64);
    ctx.stroke();

    // Frosted disc behind the glyph so thin strokes stay legible on gradient.
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(size / 2, 196, 96, 0, Math.PI * 2);
    ctx.fill();

    drawGlyph(ctx, spec.glyph, size / 2, 196, 132);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 46px ${FONT}`;
    ctx.fillText(spec.title, size / 2, 360);

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(spec.caption, size / 2, 410);

    return canvas;
  });
}

/** A chat bubble that floats beside a pin on the friends globe. */
export function chatBubbleTexture(name: string, message: string): Texture {
  return cached(`chat:${name}:${message}`, () => {
    const w = 512;
    const h = 256;
    const { canvas, ctx } = makeCanvas(w, h);

    ctx.fillStyle = 'rgba(22,33,58,0.95)';
    roundRect(ctx, 8, 8, w - 16, h - 56, 40);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.35)';
    ctx.lineWidth = 3;
    roundRect(ctx, 8, 8, w - 16, h - 56, 40);
    ctx.stroke();

    // Tail
    ctx.fillStyle = 'rgba(22,33,58,0.95)';
    ctx.beginPath();
    ctx.moveTo(72, h - 50);
    ctx.lineTo(126, h - 50);
    ctx.lineTo(84, h - 8);
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.primary;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(name, 44, 74);

    ctx.fillStyle = PALETTE.text;
    ctx.font = `500 34px ${FONT}`;
    ctx.fillText(message, 44, 132);

    return canvas;
  });
}

/**
 * The phone's home dashboard: calorie ring, macro bars, water and steps rows.
 * Deliberately the same information architecture as the app's Home tab, so the
 * render on the page and the screenshot on the store listing agree.
 */
export function dashboardScreenTexture(): Texture {
  return cached('screen:dashboard', () => {
    const w = 540;
    const h = 1120;
    const { canvas, ctx } = makeCanvas(w, h);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#101B31');
    bg.addColorStop(1, '#0B1220');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText('Today', 44, 92);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 46px ${FONT}`;
    ctx.fillText('Good evening', 44, 148);

    // Calorie ring
    const cx = w / 2;
    const cy = 366;
    const radius = 132;
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    const ring = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    ring.addColorStop(0, PALETTE.primary);
    ring.addColorStop(1, PALETTE.sky);
    ctx.strokeStyle = ring;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.68);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 76px ${FONT}`;
    ctx.fillText('684', cx, cy + 8);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText('kcal left', cx, cy + 50);

    // Macro bars
    const macros: Array<[string, string, number, string]> = [
      ['Protein', '112 / 150 g', 0.75, PALETTE.protein],
      ['Carbs', '186 / 240 g', 0.78, PALETTE.carbs],
      ['Fat', '48 / 70 g', 0.69, PALETTE.fat],
    ];
    let y = 588;
    ctx.textAlign = 'left';
    for (const [label, value, fill, color] of macros) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 28px ${FONT}`;
      ctx.fillText(label, 44, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.dim;
      ctx.font = `500 26px ${FONT}`;
      ctx.fillText(value, w - 44, y);
      ctx.textAlign = 'left';

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, 44, y + 18, w - 88, 16, 8);
      ctx.fill();
      ctx.fillStyle = color;
      roundRect(ctx, 44, y + 18, (w - 88) * fill, 16, 8);
      ctx.fill();
      y += 92;
    }

    // Water + steps cards
    const cards: Array<[string, string, string, number]> = [
      ['Water', '1 750 / 2 500 ml', PALETTE.water, 0.7],
      ['Steps', '7 412 / 9 000', PALETTE.steps, 0.82],
    ];
    y += 8;
    for (const [label, value, color, fill] of cards) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      roundRect(ctx, 36, y, w - 72, 108, 28);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(84, y + 54, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 28px ${FONT}`;
      ctx.fillText(label, 128, y + 46);
      ctx.fillStyle = PALETTE.dim;
      ctx.font = `500 24px ${FONT}`;
      ctx.fillText(value, 128, y + 82);

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, w - 220, y + 62, 168, 12, 6);
      ctx.fill();
      ctx.fillStyle = color;
      roundRect(ctx, w - 220, y + 62, 168 * fill, 12, 6);
      ctx.fill();
      y += 128;
    }

    return canvas;
  });
}

/** The phone's Scan tab: viewfinder frame, reticle and the three source chips. */
export function scanScreenTexture(): Texture {
  return cached('screen:scan', () => {
    const w = 540;
    const h = 1120;
    const { canvas, ctx } = makeCanvas(w, h);

    ctx.fillStyle = '#070C16';
    ctx.fillRect(0, 0, w, h);

    // Viewfinder area
    ctx.fillStyle = '#0E1728';
    roundRect(ctx, 36, 150, w - 72, 620, 40);
    ctx.fill();

    // Corner brackets
    ctx.strokeStyle = PALETTE.primary;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    const bx = 96;
    const by = 260;
    const bw = w - 192;
    const bh = 400;
    const arm = 56;
    const corners: Array<[number, number, number, number]> = [
      [bx, by, 1, 1],
      [bx + bw, by, -1, 1],
      [bx, by + bh, 1, -1],
      [bx + bw, by + bh, -1, -1],
    ];
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + sx * arm, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * arm);
      ctx.stroke();
    }

    // Scan line
    const line = ctx.createLinearGradient(0, by + bh * 0.45, 0, by + bh * 0.55);
    line.addColorStop(0, 'rgba(34,197,94,0)');
    line.addColorStop(0.5, 'rgba(34,197,94,0.9)');
    line.addColorStop(1, 'rgba(34,197,94,0)');
    ctx.fillStyle = line;
    ctx.fillRect(bx, by + bh * 0.45, bw, bh * 0.1);

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText('Point at a barcode or a plate', w / 2, 116);

    // Source chips
    const chips = ['Barcode', 'Photo AI', 'Search'];
    let x = 52;
    ctx.textAlign = 'center';
    for (let i = 0; i < chips.length; i++) {
      const cw = 142;
      if (i === 0) {
        const g = ctx.createLinearGradient(x, 0, x + cw, 0);
        g.addColorStop(0, PALETTE.primary);
        g.addColorStop(1, PALETTE.sky);
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
      }
      roundRect(ctx, x, 820, cw, 66, 33);
      ctx.fill();
      ctx.fillStyle = i === 0 ? PALETTE.onPrimary : PALETTE.dim;
      ctx.font = `700 26px ${FONT}`;
      ctx.fillText(chips[i], x + cw / 2, 862);
      x += cw + 14;
    }

    // Result row
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(ctx, 36, 926, w - 72, 132, 30);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText('Grilled chicken breast', 68, 984);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `500 25px ${FONT}`;
    ctx.fillText('165 kcal · P 31 g · C 0 g · F 3.6 g · 100 g', 68, 1024);

    return canvas;
  });
}

/** The phone's Coach tab: two chat turns from a coach that read your diary. */
export function coachScreenTexture(): Texture {
  return cached('screen:coach', () => {
    const w = 540;
    const h = 1120;
    const { canvas, ctx } = makeCanvas(w, h);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0D1526');
    bg.addColorStop(1, '#0B1220');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText('Coach', 44, 104);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `500 24px ${FONT}`;
    ctx.fillText('Reads your last 7 days', 44, 142);

    const bubble = (
      text: string[],
      top: number,
      mine: boolean
    ) => {
      const pad = 28;
      const lineHeight = 40;
      const boxW = 400;
      const boxH = pad * 2 + text.length * lineHeight;
      const x = mine ? w - boxW - 44 : 44;
      if (mine) {
        const g = ctx.createLinearGradient(x, top, x + boxW, top + boxH);
        g.addColorStop(0, PALETTE.primary);
        g.addColorStop(1, '#10B981');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
      }
      roundRect(ctx, x, top, boxW, boxH, 28);
      ctx.fill();
      ctx.fillStyle = mine ? PALETTE.onPrimary : PALETTE.text;
      ctx.font = `${mine ? 600 : 500} 27px ${FONT}`;
      text.forEach((line, i) => ctx.fillText(line, x + pad, top + pad + 30 + i * lineHeight));
      return top + boxH + 28;
    };

    let y = 200;
    y = bubble(['Why am I always short on', 'protein by dinner?'], y, true);
    y = bubble(
      [
        'You average 96 g against a',
        '150 g target, and 71% of it',
        'lands after 18:00. Your',
        'breakfast has been 8 g for',
        'six days running.',
      ],
      y,
      false
    );
    y = bubble(['Give me one change.'], y, true);
    bubble(
      ['Move 30 g into breakfast —', 'skyr or two eggs. Nothing', 'else has to change.'],
      y,
      false
    );

    return canvas;
  });
}

/**
 * A floating line of chat text for the Coach orb. Transparent ground with a
 * faint capsule behind it, so it reads over both the orb and the dark page.
 */
export function messageTexture(message: string): Texture {
  return cached(`msg:${message}`, () => {
    const w = 1024;
    const h = 192;
    const { canvas, ctx } = makeCanvas(w, h);

    ctx.font = `500 40px ${FONT}`;
    const textWidth = Math.min(ctx.measureText(message).width, w - 120);
    const boxW = textWidth + 96;
    const x = (w - boxW) / 2;

    ctx.fillStyle = 'rgba(9,15,27,0.78)';
    roundRect(ctx, x, 40, boxW, 112, 56);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34,197,94,0.32)';
    ctx.lineWidth = 3;
    roundRect(ctx, x, 40, boxW, 112, 56);
    ctx.stroke();

    ctx.fillStyle = PALETTE.primary;
    ctx.beginPath();
    ctx.arc(x + 40, 96, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, x + 66, 98, w - 160);

    return canvas;
  });
}

/**
 * A canvas that a component owns and repaints — used by the scanner readout,
 * where the point is watching the characters arrive. Everything else in this
 * module is immutable and cached; this one deliberately is not.
 */
export function createLiveLabel(width = 640, height = 320) {
  const { canvas, ctx } = makeCanvas(width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;

  /** Repaints the readout with the first `chars` characters of each line. */
  const paint = (title: string, lines: string[], chars: number) => {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(9,15,27,0.82)';
    roundRect(ctx, 4, 4, width - 8, height - 8, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34,197,94,0.45)';
    ctx.lineWidth = 3;
    roundRect(ctx, 4, 4, width - 8, height - 8, 28);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // The title types first, then each detail line in turn.
    let budget = chars;
    const take = (text: string) => {
      const shown = text.slice(0, Math.max(0, Math.min(text.length, budget)));
      budget -= text.length;
      return shown;
    };

    ctx.fillStyle = PALETTE.primary;
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(take(title), 34, 76);

    ctx.font = `500 30px ${FONT}`;
    let y = 138;
    for (const line of lines) {
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(take(line), 34, y);
      y += 48;
    }

    // Caret, while there is still text to come.
    const total = title.length + lines.reduce((sum, line) => sum + line.length, 0);
    if (chars < total) {
      ctx.fillStyle = PALETTE.primary;
      ctx.fillRect(34, y - 26, 14, 4);
    }

    texture.needsUpdate = true;
  };

  return { texture, paint, dispose: () => texture.dispose() };
}

/** Frees every cached texture. Called when the scene unmounts. */
export function disposeTextures(): void {
  cache.forEach((texture) => texture.dispose());
  cache.clear();
}
