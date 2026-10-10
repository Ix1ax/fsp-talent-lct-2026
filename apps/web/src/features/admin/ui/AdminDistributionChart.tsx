import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export type AdminChartSegment = {
  label: string;
  value: number;
  color: string;
  href?: string;
};
interface AdminDistributionChartProps {
  title: string;
  total: number;
  segments: AdminChartSegment[];
  kind?: 'donut' | 'bars';
}
export const AdminDistributionChart = ({
  title,
  total,
  segments,
  kind = 'donut',
}: AdminDistributionChartProps) => {
  const legend = segments.map((segment) => {
    const percent = total ? (segment.value / total) * 100 : 0;
    const body = (
      <>
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: segment.color }}
          />
          <span>{segment.label}</span>
          {segment.href && (
            <ArrowUpRight
              aria-hidden="true"
              size={13}
              className="shrink-0 text-muted-foreground"
            />
          )}
        </span>
        <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
          <span className="font-medium text-foreground">
            {segment.value.toLocaleString('ru-RU')}
          </span>
          <span className="min-w-11 text-right text-xs text-muted-foreground">
            {percent.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%
          </span>
        </span>
      </>
    );
    return (
      <li key={segment.label} className="grid gap-2">
        {segment.href ? (
          <Link
            href={segment.href}
            className="flex min-h-11 items-center justify-between gap-3 rounded-md text-sm underline-offset-4 hover:text-brand-text hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {body}
          </Link>
        ) : (
          <div className="flex min-h-11 items-center justify-between gap-3 text-sm">
            {body}
          </div>
        )}
        {kind === 'bars' && (
          <div
            aria-hidden="true"
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(percent, 100)}%`,
                background: segment.color,
              }}
            />
          </div>
        )}
      </li>
    );
  });
  return (
    <div
      className={
        kind === 'donut'
          ? 'grid min-w-0 items-center gap-6 sm:grid-cols-[180px_minmax(0,1fr)]'
          : 'grid gap-4'
      }
    >
      {kind === 'donut' && (
        <div className="relative mx-auto size-44">
          <svg
            viewBox="0 0 160 160"
            role="img"
            aria-label={`${title}: всего ${total.toLocaleString('ru-RU')}. ${segments.map((s) => `${s.label}: ${s.value}`).join(', ')}`}
            className="size-full -rotate-90"
          >
            <circle
              cx="80"
              cy="80"
              r="65"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="14"
            />
            {segments.map((segment, index) => {
              const percent = total ? (segment.value / total) * 100 : 0;
              const offset = total
                ? (segments
                    .slice(0, index)
                    .reduce((sum, item) => sum + item.value, 0) /
                    total) *
                  100
                : 0;
              return (
                <circle
                  key={segment.label}
                  cx="80"
                  cy="80"
                  r="65"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="14"
                  pathLength="100"
                  strokeDasharray={`${percent} ${100 - percent}`}
                  strokeDashoffset={-offset}
                />
              );
            })}
          </svg>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="max-w-32 text-2xl font-semibold tabular-nums">
              {total.toLocaleString('ru-RU')}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">всего</span>
          </div>
        </div>
      )}
      <ul
        className={
          kind === 'bars' ? 'grid min-w-0 gap-4' : 'grid min-w-0 gap-1'
        }
      >
        {legend}
      </ul>
      {!total && (
        <p className="text-xs text-muted-foreground sm:col-span-full">
          Данных пока нет. Показатели появятся после первых действий на
          платформе.
        </p>
      )}
    </div>
  );
};
