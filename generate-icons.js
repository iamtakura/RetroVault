import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, size, size);

  // Cassette shell outline
  const pad = size * 0.15;
  const shellW = size - 2 * pad;
  const shellH = size * 0.55;
  const shellX = pad;
  const shellY = (size - shellH) * 0.45;
  const r = size * 0.04;

  ctx.fillStyle = '#b01020'; // Crimson cassette
  
  // Rounded rect for main body
  roundedRect(ctx, shellX, shellY, shellW, shellH, r);
  ctx.fill();

  // Bottom trapezoid header piece
  const headW = shellW * 0.65;
  const headH = shellH * 0.22;
  const headX = shellX + (shellW - headW) / 2;
  const headY = shellY + shellH - 2;

  ctx.beginPath();
  ctx.moveTo(headX, headY);
  ctx.lineTo(headX + headW, headY);
  ctx.lineTo(headX + headW - (size * 0.03), headY + headH);
  ctx.lineTo(headX + (size * 0.03), headY + headH);
  ctx.closePath();
  ctx.fill();

  // Window cut-out in center
  const winW = shellW * 0.55;
  const winH = shellH * 0.35;
  const winX = shellX + (shellW - winW) / 2;
  const winY = shellY + (shellH - winH) / 2 - (size * 0.02);

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(winX, winY, winW, winH);

  // Spindle holes inside window
  const holeRadius = size * 0.035;
  const holeOffsetY = winY + winH / 2;
  const holeLeftX = winX + winW * 0.25;
  const holeRightX = winX + winW * 0.75;

  ctx.fillStyle = '#eae3d2'; // center pin color
  ctx.beginPath();
  ctx.arc(holeLeftX, holeOffsetY, holeRadius, 0, Math.PI * 2);
  ctx.arc(holeRightX, holeOffsetY, holeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(holeLeftX, holeOffsetY, holeRadius * 0.5, 0, Math.PI * 2);
  ctx.arc(holeRightX, holeOffsetY, holeRadius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Text "RV" in Courier (Special Elite styling fallback)
  ctx.fillStyle = '#eae3d2';
  const fontSize = size * 0.12;
  ctx.font = `bold ${fontSize}px Courier New, Courier, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Position text above the window on the label area
  const textX = size / 2;
  const textY = shellY + (winY - shellY) / 2 + 2;
  ctx.fillText('RV', textX, textY);

  return canvas.toBuffer('image/png');
}

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192
const buf192 = drawIcon(192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), buf192);
console.log('Generated public/icon-192.png');

// Generate 512x512
const buf512 = drawIcon(512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), buf512);
console.log('Generated public/icon-512.png');
