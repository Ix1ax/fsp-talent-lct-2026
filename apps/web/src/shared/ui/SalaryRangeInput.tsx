'use client';
import { useId } from 'react';

import { Input } from './Input';
export interface SalaryRange {
  from: number | null;
  to: number | null;
}
interface SalaryRangeInputProps extends SalaryRange {
  onChange: (range: SalaryRange) => void;
  errors?: Partial<Record<keyof SalaryRange, string>>;
  disabled?: boolean;
}
export const SalaryRangeInput = ({
  from,
  to,
  onChange,
  errors = {},
  disabled,
}: SalaryRangeInputProps) => {
  const id = useId();
  return (
    <div className="grid grid-cols-2 gap-3">
      {(
        [
          ['from', 'От', from],
          ['to', 'До', to],
        ] as const
      ).map(([key, label, value]) => (
        <label key={key} className="grid gap-1.5 text-sm">
          {label}, ₽/мес
          <Input
            disabled={disabled}
            type="number"
            inputMode="numeric"
            min={0}
            max={1000000000}
            step={1}
            value={value ?? ''}
            onChange={(e) =>
              onChange({
                from,
                to,
                [key]: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="font-mono"
            aria-invalid={!!errors[key]}
            aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
          />
          {errors[key] && (
            <span
              id={`${id}-${key}-error`}
              className="text-xs text-destructive"
            >
              {errors[key]}
            </span>
          )}
        </label>
      ))}
    </div>
  );
};
