import { useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';

const initialValues = [3, 1, 5, 2, 4];

export const AlgorithmVisual = () => {
  const [values, setValues] = useState(initialValues);
  const sorted = values.every(
    (value, index) => index === 0 || values[index - 1] <= value,
  );

  const step = () => {
    setValues((current) => {
      const next = [...current];
      const index = next.findIndex(
        (value, i) => i < next.length - 1 && value > next[i + 1],
      );

      if (index >= 0) {
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
      }

      return next;
    });
  };

  return (
    <div className="flex h-85 flex-col justify-between gap-4 p-5">
      <div
        className="flex h-51.25 items-end justify-center gap-3 pb-6"
        aria-hidden="true"
      >
        {values.map((value) => (
          <div
            key={value}
            className="relative w-9 rounded-t bg-white/70 transition-[height] duration-300 motion-reduce:transition-none"
            style={{ height: value * 30 }}
          >
            <span className="absolute inset-x-0 -bottom-6 text-center text-xs">
              {value}
            </span>
          </div>
        ))}
      </div>
      <div>
        <p
          className="mb-3 text-center text-xs text-white/80"
          aria-live="polite"
        >
          {sorted
            ? 'Готово — массив отсортирован'
            : 'Меняй соседние элементы местами'}
        </p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={step}
            disabled={sorted}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/30 px-4 text-xs hover:bg-white/15 disabled:opacity-50"
          >
            Шаг сортировки <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => setValues(initialValues)}
            aria-label="Начать сортировку заново"
            className="grid size-11 place-items-center rounded-lg border border-white/30 hover:bg-white/15"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
