export const THEMES = [
  {
    id: 'crimson-noir',
    name: 'CRIMSON NOIR',
    description: 'Classic RetroVault',
    bg: '#0a0a0a',
    accent: '#8b0000',
    accentBright: '#c0392b',
    surface: '#1a1a1a',
    text: '#d4c5b0'
  },
  {
    id: 'midnight-cobalt',
    name: 'MIDNIGHT COBALT',
    description: 'Late night session',
    bg: '#070a12',
    accent: '#1a3a6b',
    accentBright: '#2e6bc4',
    surface: '#0f1520',
    text: '#b8c8e0'
  },
  {
    id: 'oxidized-copper',
    name: 'OXIDIZED COPPER',
    description: 'Vintage military',
    bg: '#080a08',
    accent: '#4a7c59',
    accentBright: '#5a9e6f',
    surface: '#0f140f',
    text: '#c0d4b8'
  },
  {
    id: 'amber-reel',
    name: 'AMBER REEL',
    description: 'Old film projector',
    bg: '#09080a',
    accent: '#7a4a00',
    accentBright: '#c47a00',
    surface: '#140f08',
    text: '#d4c5a0'
  }
];

export const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
