import type { KeyboardEvent, PointerEvent } from 'react';
import { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  RotateCcw,
} from 'lucide-react';

import { clamp } from '@/shared/utils';

const BUTTONS = [
  { label: 'Влево', icon: ArrowLeft, x: -10, y: 0 },
  { label: 'Вверх', icon: ArrowUp, x: 0, y: -10 },
  { label: 'Вниз', icon: ArrowDown, x: 0, y: 10 },
  { label: 'Вправо', icon: ArrowRight, x: 10, y: 0 },
];

export const DroneVisual = () => {
  const [position, setPosition] = useState({ x: 20, y: 75 });
  const reached =
    Math.abs(position.x - 80) < 10 && Math.abs(position.y - 25) < 10;

  const move = (x: number, y: number) => {
    setPosition((current) => ({
      x: clamp(current.x + x),
      y: clamp(current.y + y),
    }));
  };

  const point = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: clamp(((event.clientX - bounds.left) / bounds.width) * 100),
      y: clamp(((event.clientY - bounds.top) / bounds.height) * 100),
    });
  };

  const key = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -10],
      ArrowDown: [0, 10],
      ArrowLeft: [-10, 0],
      ArrowRight: [10, 0],
    };

    if (moves[event.key]) {
      event.preventDefault();
      move(...moves[event.key]);
    }
  };

  return (
    <div className="flex h-85 flex-col justify-between gap-3 p-5">
      <button
        type="button"
        onPointerDown={point}
        onKeyDown={key}
        aria-label="Поле полёта: выбери точку касанием или перемещай беспилотник стрелками клавиатуры"
        className="relative h-43.75 w-full cursor-crosshair overflow-hidden rounded-lg border border-white/25 bg-white/5"
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          <path
            d={`M20 75 L${position.x} ${position.y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="3 3"
            opacity=".5"
          />
          <circle
            cx="80"
            cy="25"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            opacity=".6"
          />
        </svg>
        <Crosshair
          size={28}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-200 motion-reduce:transition-none"
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
          aria-hidden="true"
        />
      </button>
      <p className="text-center text-xs text-white/80" aria-live="polite">
        {reached
          ? 'Точка назначения достигнута'
          : 'Направь беспилотник к кругу'}
      </p>
      <div className="flex justify-center gap-1">
        {BUTTONS.map(({ label, icon: Icon, x, y }) => (
          <button
            key={label}
            type="button"
            onClick={() => move(x, y)}
            aria-label={`Беспилотник: ${label.toLowerCase()}`}
            className="grid size-11 place-items-center rounded-lg border border-white/30 hover:bg-white/15"
          >
            <Icon size={16} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPosition({ x: 20, y: 75 })}
          aria-label="Вернуть беспилотник на старт"
          className="grid size-11 place-items-center rounded-lg border border-white/30 hover:bg-white/15"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
};
