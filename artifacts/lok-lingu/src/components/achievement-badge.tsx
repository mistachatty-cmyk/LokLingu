import { Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AchievementDef } from '@/data/achievements';

interface AchievementBadgeProps {
  achievement: AchievementDef;
  earned: boolean;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const TIER_COLORS: Record<AchievementDef['tier'], string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

const SIZE_MAP = {
  sm: 80,
  md: 100,
  lg: 120,
};

export function AchievementBadge({
  achievement,
  earned,
  progress,
  size = 'md',
  onClick,
}: AchievementBadgeProps) {
  const px = SIZE_MAP[size];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all',
        'bg-card text-card-foreground shadow-sm',
        earned
          ? 'border-border/80'
          : 'border-border/30 opacity-60 grayscale',
        onClick && 'cursor-pointer hover:shadow-md active:scale-95',
      )}
      style={{ width: px, minHeight: px }}
    >
      {earned && (
        <div className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 shadow">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}

      {!earned && (
        <div className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/50 shadow">
          <Lock className="h-3 w-3 text-muted" />
        </div>
      )}

      <span className="text-2xl leading-none" style={{ fontSize: px * 0.3 }}>
        {achievement.icon}
      </span>

      <span
        className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide"
        style={{ maxWidth: px - 16 }}
      >
        {achievement.name}
      </span>

      <span className="text-[9px] leading-tight text-muted-foreground">
        {achievement.label}
      </span>

      <div
        className="mt-1 h-1 w-full rounded-full bg-muted"
        style={{ maxWidth: px - 16 }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(progress ?? 0, 100)}%`,
            backgroundColor: TIER_COLORS[achievement.tier],
          }}
        />
      </div>
    </button>
  );
}
