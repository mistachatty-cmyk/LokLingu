export interface CursorDef {
  id: string;
  name: string;
  desc: string;
  tier: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  type: 'glass-overlay' | 'trail';
  icon: string;
  color: string;
  tokenCost?: number;
}

export const CURSORS: CursorDef[] = [
  {
    id: 'classic',
    name: 'Classic',
    desc: 'The default pointer. Clean and familiar.',
    tier: 'A',
    type: 'glass-overlay',
    icon: '👆',
    color: 'transparent',
  },
  {
    id: 'glass-orb',
    name: 'Glass Orb',
    desc: 'A translucent glass sphere follows your cursor. Ultimate tier.',
    tier: 'F',
    type: 'glass-overlay',
    icon: '🔮',
    color: 'hsl(180 100% 50%)',
    tokenCost: 500,
  },
  {
    id: 'glass-cyan',
    name: 'Cyan Glass',
    desc: 'Cyan-tinted liquid glass refraction.',
    tier: 'F',
    type: 'glass-overlay',
    icon: '💎',
    color: 'hsl(180 100% 60%)',
    tokenCost: 750,
  },
];

export const TRAILS: CursorDef[] = [
  {
    id: 'no-trail',
    name: 'None',
    desc: 'No trail effect.',
    tier: 'A',
    type: 'trail',
    icon: '—',
    color: 'transparent',
  },
  {
    id: 'sparkle',
    name: 'Sparkle Trail',
    desc: 'Tiny sparkles follow your cursor.',
    tier: 'B',
    type: 'trail',
    icon: '✨',
    color: '#ffdd44',
    tokenCost: 200,
  },
  {
    id: 'neon',
    name: 'Neon Trail',
    desc: 'A glowing neon line trails behind.',
    tier: 'C',
    type: 'trail',
    icon: '🌈',
    color: 'hsl(180 100% 50%)',
    tokenCost: 350,
  },
  {
    id: 'glass-shard',
    name: 'Glass Shard',
    desc: 'Shattered glass particles drift from your cursor. Ultimate tier.',
    tier: 'F',
    type: 'trail',
    icon: '🪟',
    color: 'hsl(180 80% 70%)',
    tokenCost: 1000,
  },
];

export const CURSOR_BY_ID = Object.fromEntries(
  [...CURSORS, ...TRAILS].map((c) => [c.id, c]),
) as Record<string, CursorDef>;
