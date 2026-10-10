import { cn } from '@/shared/lib/utils';

interface MatchScoreRingProps {
  value: number;
  className?: string;
}

const getTone = (value: number) => {
  if (value >= 80) return 'text-success';
  if (value >= 50) return 'text-brand-text';
  return 'text-warning';
};

/** Кольцо с процентом совпадения: цвет — уровень, заполнение — величина. */
export const MatchScoreRing = ({ value, className }: MatchScoreRingProps) => {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  const radius = 26;
  const length = 2 * Math.PI * radius;

  return (
    <div
      role="img"
      aria-label={`Совпадение с требованиями: ${percent}%`}
      className={cn('relative size-16 shrink-0', getTone(percent), className)}
    >
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          className="stroke-muted"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - percent / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-semibold text-foreground tabular-nums">
        {percent}
        <span className="text-[0.625rem] text-muted-foreground">%</span>
      </span>
    </div>
  );
};
