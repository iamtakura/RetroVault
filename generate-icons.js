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

  // Scale context from 64x64 design to target size
  ctx.scale(size / 64, size / 64);

  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 64, 64);

  // Background rounded rect
  roundedRect(ctx, 0, 0, 64, 64, 12);
  ctx.fill();

  // Cassette body
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, 8, 18, 48, 30, 4);
  ctx.fill();
  ctx.stroke();

  // Tape window
  ctx.fillStyle = '#111111';
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  roundedRect(ctx, 14, 25, 36, 16, 2);
  ctx.fill();
  ctx.stroke();

  // Left reel
  ctx.fillStyle = '#0a0a0a';
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(22, 33, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#8b0000';
  ctx.beginPath();
  ctx.arc(22, 33, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(22, 33, 1, 0, Math.PI * 2);
  ctx.fill();

  // Right reel
  ctx.fillStyle = '#0a0a0a';
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(42, 33, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#8b0000';
  ctx.beginPath();
  ctx.arc(42, 33, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(42, 33, 1, 0, Math.PI * 2);
  ctx.fill();

  // Tape strand
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(22, 38);
  ctx.quadraticCurveTo(32, 42, 42, 38);
  ctx.stroke();

  // Label strip
  ctx.fillStyle = 'rgba(212, 197, 176, 0.12)';
  roundedRect(ctx, 12, 20, 40, 5, 1);
  ctx.fill();

  // Top notches
  ctx.fillStyle = '#0a0a0a';
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1;
  roundedRect(ctx, 14, 16, 4, 4, 1);
  ctx.fill();
  ctx.stroke();

  roundedRect(ctx, 46, 16, 4, 4, 1);
  ctx.fill();
  ctx.stroke();

  // Crimson accent line
  ctx.fillStyle = 'rgba(139, 0, 0, 0.8)';
  roundedRect(ctx, 8, 44, 48, 2, 1);
  ctx.fill();

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
