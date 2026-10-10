import { useState } from 'react';
import { Check, LockKeyhole, ShieldCheck, ShieldQuestion } from 'lucide-react';

export const SecurityVisual = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  return (
    <div className="flex h-85 flex-col items-center justify-between p-5">
      <div
        className="relative mt-4 grid size-36 place-items-center rounded-full border border-white/20"
        aria-hidden="true"
      >
        {isEnabled ? (
          <ShieldCheck size={88} strokeWidth={1} />
        ) : (
          <ShieldQuestion size={88} strokeWidth={1} />
        )}
        <span className="absolute -right-1 top-1 grid size-9 place-items-center rounded-full bg-white text-primary">
          {isEnabled ? <Check size={18} /> : <LockKeyhole size={18} />}
        </span>
      </div>
      <div className="w-full">
        <p
          className="mb-3 text-center text-xs text-white/80"
          aria-live="polite"
        >
          {isEnabled
            ? 'Демонстрация: доступ защищён'
            : 'Добавь проверку доступа'}
        </p>
        <button
          type="button"
          aria-pressed={isEnabled}
          onClick={() => setIsEnabled((value) => !value)}
          className="mx-auto flex min-h-11 items-center gap-3 rounded-lg border border-white/30 px-4 text-xs hover:bg-white/15"
        >
          <span
            className="relative h-5 w-9 rounded-full bg-white/20"
            aria-hidden="true"
          >
            <span
              className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform motion-reduce:transition-none ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`}
            />
          </span>
          Проверка доступа
        </button>
      </div>
    </div>
  );
};
