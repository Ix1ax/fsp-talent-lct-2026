import { useState } from 'react';
import { LayoutDashboard, PanelsTopLeft } from 'lucide-react';

type ProductLayout = 'dashboard' | 'website';

const LAYOUTS = [
  { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { id: 'website', label: 'Сайт', icon: PanelsTopLeft },
] as const;

export const ProductVisual = () => {
  const [layout, setLayout] = useState<ProductLayout>('dashboard');

  return (
    <div className="flex h-85 flex-col justify-between gap-4 p-5">
      <div
        className="mx-auto w-full max-w-75 overflow-hidden rounded-xl border border-white/40 bg-white/5"
        aria-hidden="true"
      >
        <div className="flex gap-1.5 border-b border-white/20 p-3">
          <i className="size-1.5 rounded-full bg-white/70" />
          <i className="size-1.5 rounded-full bg-white/50" />
          <i className="size-1.5 rounded-full bg-white/30" />
        </div>
        <div
          className={
            layout === 'dashboard'
              ? 'grid h-45 grid-cols-[1fr_2fr] gap-3 p-4'
              : 'grid h-45 grid-cols-3 gap-3 p-4'
          }
        >
          <div
            className={
              layout === 'dashboard'
                ? 'row-span-2 rounded bg-white/20'
                : 'col-span-3 rounded bg-white/40'
            }
          />
          <div className="rounded bg-white/60" />
          <div className="rounded bg-white/30" />
          {layout === 'website' && <div className="rounded bg-white/20" />}
        </div>
      </div>
      <div>
        <p className="mb-3 text-center text-xs text-white/80">
          Собери свой интерфейс
        </p>
        <div className="flex justify-center gap-2">
          {LAYOUTS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={layout === id}
              onClick={() => setLayout(id)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/30 px-3 text-xs transition-colors hover:bg-white/15 aria-pressed:bg-white aria-pressed:text-primary"
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
