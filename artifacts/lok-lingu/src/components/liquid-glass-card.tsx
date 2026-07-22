import { type ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
  glassIntensity?: 'low' | 'medium' | 'high';
}

const GLASS_SHADOW =
  'shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]';

const INTENSITY_MAP = {
  low: 'backdrop-blur-[1px]',
  medium: 'backdrop-blur-[4px]',
  high: 'backdrop-blur-[8px]',
};

export const LiquidGlassCard = memo(function LiquidGlassCard({
  children,
  className,
  as: Tag = 'div',
  glassIntensity = 'medium',
}: Props) {
  return (
    <Tag
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60',
        'bg-background/20',
        INTENSITY_MAP[glassIntensity],
        GLASS_SHADOW,
        className,
      )}
    >
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <div className="relative z-10">{children}</div>
    </Tag>
  );
});
