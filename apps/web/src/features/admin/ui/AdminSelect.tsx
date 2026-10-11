import { useId } from 'react';

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';

interface AdminSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
  showLabel?: boolean;
  error?: string;
  reserveErrorSpace?: boolean;
}
export const AdminSelect = ({
  value,
  onChange,
  options,
  label,
  disabled,
  showLabel = false,
  error,
  reserveErrorSpace = showLabel,
}: AdminSelectProps) => {
  const id = useId();
  return (
    <div
      data-admin-field={showLabel ? '' : undefined}
      className="grid min-w-0 content-start gap-1.5 text-sm"
    >
      {showLabel && (
        <Label htmlFor={id} className="min-h-5 leading-5">
          {label}
        </Label>
      )}
      <Select
        value={value || 'all'}
        onValueChange={(next) => onChange(next === 'all' ? '' : next)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="w-full min-w-0 px-3 py-2 data-[size=default]:h-11 text-base sm:text-sm"
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <SelectValue placeholder={label} className="min-w-0 flex-1">
            <span className="truncate">
              {options.find((option) => option.value === value)?.label ?? label}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          className="w-(--radix-select-trigger-width)"
          viewportClassName="p-1.5 data-[position=popper]:min-w-0"
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value || 'all'}
              className="min-h-10 py-2 pr-8 pl-3"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(reserveErrorSpace || error) && (
        <span
          id={`${id}-error`}
          role={error ? 'alert' : undefined}
          className="min-h-4 text-xs text-destructive"
        >
          {error}
        </span>
      )}
    </div>
  );
};
