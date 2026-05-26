/**
 * SafeGuard Icon Generator
 * Generates app icon PNGs using Jimp (pure JS, no native deps).
 * Run once: node scripts/generate-icons.js
 */

const Jimp = require("jimp");
const path = require("path");
const fs = require("fs");

const assetsDir = path.join(__dirname, "..", "assets");
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// ── Color constants ────────────────────────────────────────────────────────
const COLOR_PRIMARY   = Jimp.cssColorToHex("#be185d");  // pink-700
const COLOR_DARK      = Jimp.cssColorToHex("#9d174d");  // pink-800
const COLOR_VIOLET    = Jimp.cssColorToHex("#7c3aed");  // violet-600
const COLOR_WHITE     = Jimp.cssColorToHex("#ffffff");
const COLOR_OFFWHITE  = Jimp.cssColorToHex("#fdf2f8");

// ── Helpers ─────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 24) & 0xff, g1 = (c1 >> 16) & 0xff, b1 = (c1 >> 8) & 0xff;
  const r2 = (c2 >> 24) & 0xff, g2 = (c2 >> 16) & 0xff, b2 = (c2 >> 8) & 0xff;
  return Jimp.rgbaToInt(
    Math.round(lerp(r1, r2, t)),
    Math.round(lerp(g1, g2, t)),
    Math.round(lerp(b1, b2, t)),
    255
  );
}

// ── Draw gradient background ────────────────────────────────────────────────
function drawGradientBg(img, size) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (size * 2); // diagonal gradient
      const color = lerpColor(COLOR_DARK, COLOR_VIOLET, t);
      img.setPixelColor(color, x, y);
    }
  }
}

// ── Draw shield outline by filling pixels inside shield path ─────────────────
function drawShield(img, cx, cy, shieldW, shieldH, fillColor) {
  const hw = shieldW / 2;
  const topY = cy - shieldH / 2;
  const curves = shieldH * 0.45; // where the sides start curving in

  for (let y = 0; y < shieldH; y++) {
    const py = topY + y;
    const progress = y / shieldH; // 0 = top, 1 = bottom

    let halfWidth;
    if (progress < 0.1) {
      // Top: full width (straight)
      halfWidth = hw;
    } else if (progress < 0.55) {
      // Middle: slight taper
      halfWidth = hw * (1 - (progress - 0.1) * 0.15);
    } else {
      // Bottom: curve to point
      halfWidth = hw * (1 - 0.15) * Math.pow(1 - (progress - 0.55) / 0.45, 0.5);
    }

    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
      img.setPixelColor(fillColor, Math.round(cx + dx), Math.round(py));
    }
  }
}

// ── Draw a circle (hollow) ───────────────────────────────────────────────────
function drawCircle(img, cx, cy, r, strokeWidth, color) {
  for (let angle = 0; angle < 360; angle += 0.5) {
    for (let s = -strokeWidth / 2; s <= strokeWidth / 2; s++) {
      const rad = (angle * Math.PI) / 180;
      const px = Math.round(cx + (r + s) * Math.cos(rad));
      const py = Math.round(cy + (r + s) * Math.sin(rad));
      img.setPixelColor(color, px, py);
    }
  }
}

// ── Draw a thick line ─────────────────────────────────────────────────────────
function drawLine(img, x1, y1, x2, y2, thickness, color) {
  const dx = x2 - x1, dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = Math.round(x1 + dx * t);
    const py = Math.round(y1 + dy * t);
    for (let tx = -thickness; tx <= thickness; tx++) {
      for (let ty = -thickness; ty <= thickness; ty++) {
        if (tx * tx + ty * ty <= thickness * thickness) {
          img.setPixelColor(color, px + tx, py + ty);
        }
      }
    }
  }
}

// ── Generate a single icon ───────────────────────────────────────────────────
async function generateIcon(size, filename) {
  const img = new Jimp(size, size);

  // rounded rect background (gradient)
  const radius = Math.round(size * 0.22);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inRounded =
        x >= radius && x <= size - radius ||
        y >= radius && y <= size - radius ||
        Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2)) <= radius ||
        Math.sqrt(Math.pow(x - (size - radius), 2) + Math.pow(y - radius, 2)) <= radius ||
        Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - (size - radius), 2)) <= radius ||
        Math.sqrt(Math.pow(x - (size - radius), 2) + Math.pow(y - (size - radius), 2)) <= radius;

      if (inRounded) {
        const t = (x + y) / (size * 2);
        const color = lerpColor(
          Jimp.rgbaToInt(0x9d, 0x17, 0x4d, 255),
          Jimp.rgbaToInt(0x7c, 0x3a, 0xed, 255),
          t
        );
        img.setPixelColor(color, x, y);
      }
    }
  }

  // Shield
  const shieldW = size * 0.52;
  const shieldH = size * 0.60;
  const cx = size / 2;
  const cy = size * 0.46;
  const innerFill = Jimp.rgbaToInt(255, 255, 255, 50);
  drawShield(img, cx, cy, shieldW, shieldH, Jimp.rgbaToInt(255, 255, 255, 60));

  // Inner circle (female symbol)
  const circleR = size * 0.14;
  const circleY = cy - size * 0.04;
  drawCircle(img, cx, circleY, circleR, Math.round(size * 0.025), COLOR_WHITE);

  // Checkmark inside circle
  const ck = size * 0.06;
  drawLine(img, cx - ck * 0.7, circleY, cx - ck * 0.1, circleY + ck * 0.7, Math.round(size * 0.02), COLOR_WHITE);
  drawLine(img, cx - ck * 0.1, circleY + ck * 0.7, cx + ck, circleY - ck * 0.5, Math.round(size * 0.02), COLOR_WHITE);

  // Female symbol stem
  drawLine(img, cx, circleY + circleR + 1, cx, circleY + circleR + size * 0.1, Math.round(size * 0.02), COLOR_WHITE);
  drawLine(img, cx - size * 0.07, circleY + circleR + size * 0.06, cx + size * 0.07, circleY + circleR + size * 0.06, Math.round(size * 0.02), COLOR_WHITE);

  await img.writeAsync(path.join(assetsDir, filename));
  console.log(`✅ Generated ${filename} (${size}x${size})`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log("Generating SafeGuard app icons...\n");
  await generateIcon(1024, "icon.png");
  await generateIcon(1024, "adaptive-icon.png");
  await generateIcon(512,  "splash-icon.png");
  await generateIcon(48,   "favicon.png");
  console.log("\n✅ All icons generated in assets/");
})().catch(console.error);
