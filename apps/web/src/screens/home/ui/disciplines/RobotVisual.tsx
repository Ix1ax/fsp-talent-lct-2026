import { useId, useState } from 'react';
import { Bot } from 'lucide-react';

export const RobotVisual = () => {
  const id = useId();
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);

  return (
    <div className="flex h-85 flex-col justify-between gap-4 p-5">
      <div
        className="relative h-45 rounded-lg border border-white/25 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[25%_25%]"
        aria-hidden="true"
      >
        <div className="absolute inset-6">
          <Bot
            size={38}
            strokeWidth={1.5}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-150 motion-reduce:transition-none"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-[20px_1fr_28px] items-center gap-x-3 gap-y-3 text-xs">
        <label htmlFor={`${id}-x`}>X</label>
        <input
          id={`${id}-x`}
          aria-label="Положение робота по оси X"
          type="range"
          min="0"
          max="100"
          value={x}
          onChange={(event) => setX(Number(event.target.value))}
          className="h-6 w-full cursor-pointer accent-white"
        />
        <output htmlFor={`${id}-x`}>{x}</output>
        <label htmlFor={`${id}-y`}>Y</label>
        <input
          id={`${id}-y`}
          aria-label="Положение робота по оси Y"
          type="range"
          min="0"
          max="100"
          value={y}
          onChange={(event) => setY(Number(event.target.value))}
          className="h-6 w-full cursor-pointer accent-white"
        />
        <output htmlFor={`${id}-y`}>{y}</output>
      </div>
      <p className="text-center text-xs text-white/80">
        Управляй координатами робота
      </p>
    </div>
  );
};
