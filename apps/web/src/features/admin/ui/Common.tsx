import { type ReactNode, useId } from 'react';

import {
  Button,
  Combobox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@/shared/ui';
import {
  AdminApiError,
  type CatalogItem,
  statusLabels,
} from '@/entities/admin';

interface FieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  reserveErrorSpace?: boolean;
}
export const Field = ({
  label,
  children,
  error,
  reserveErrorSpace = true,
}: FieldProps) => (
  <label className="grid min-w-0 gap-1.5 text-sm">
    <span className="font-medium">{label}</span>
    {children}
    {(reserveErrorSpace || error) && (
      <span className="min-h-4 text-xs text-destructive">{error}</span>
    )}
  </label>
);
interface AdminSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
  showLabel?: boolean;
}
export const AdminSelect = ({
  value,
  onChange,
  options,
  label,
  disabled,
  showLabel = false,
}: AdminSelectProps) => {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-2">
      {showLabel && <Label htmlFor={id}>{label}</Label>}
      <Select
        value={value || 'all'}
        onValueChange={(next) => onChange(next === 'all' ? '' : next)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="w-full min-w-0 data-[size=default]:h-11"
          aria-label={label}
        >
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          className="w-(--radix-select-trigger-width)"
        >
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value || 'all'}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
interface ErrorNoticeProps {
  error: unknown;
}
export const ErrorNotice = ({ error }: ErrorNoticeProps) => {
  if (!error) return null;
  const message =
    error instanceof Error ? error.message : 'Не удалось выполнить запрос';
  return (
    <div
      role="alert"
      className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {message}
      {error instanceof AdminApiError && error.requestId && (
        <div className="mt-2 text-xs">Код запроса: {error.requestId}</div>
      )}
      {error instanceof AdminApiError && error.status === 429 && (
        <div className="mt-2">
          Повторите вход позже. Пауза: {error.retryAfter ?? '900'} секунд.
        </div>
      )}
    </div>
  );
};
export const Status = ({ value }: { value: string }) => (
  <span
    className={`inline-block shrink-0 whitespace-nowrap border px-2 py-1 text-xs ${value === 'published' || value === 'approved' || value === 'active' ? 'border-success/30 bg-success-soft text-success' : 'border-border bg-muted text-muted-foreground'}`}
  >
    {statusLabels[value] ?? value}
  </span>
);
interface PaginationProps {
  offset: number;
  count: number;
  total?: number;
  onChange: (offset: number) => void;
  loading: boolean;
}
export const Pagination = ({
  offset,
  count,
  total,
  onChange,
  loading,
}: PaginationProps) => (
  <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
    <span className="text-muted-foreground">
      {count ? `${offset + 1}–${offset + count}` : 'Нет записей'}
      {total !== undefined && ` из ${total}`}
    </span>
    {(offset > 0 || count >= 20 || (total ?? 0) > 20) && (
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={loading || offset === 0}
          onClick={() => onChange(Math.max(0, offset - 20))}
        >
          Назад
        </Button>
        <Button
          variant="outline"
          disabled={
            loading ||
            (total === undefined ? count < 20 : offset + count >= total) ||
            offset >= 10000
          }
          onClick={() => onChange(offset + 20)}
        >
          Далее
        </Button>
      </div>
    )}
  </div>
);
interface SkillPickerProps {
  value: string;
  onChange: (value: string) => void;
  items: CatalogItem[];
  label?: string;
  disabled?: boolean;
}
export const SkillPicker = ({
  value,
  onChange,
  items,
  label = 'Навык',
  disabled,
}: SkillPickerProps) => {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        id={id}
        options={items.map((s) => ({
          value: s.id,
          label: s.name,
          keywords: [s.code, ...(s.aliases ?? [])],
        }))}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        placeholder={
          value
            ? (items.find((s) => s.id === value)?.name ?? `Выбрано: ${value}`)
            : 'Выберите навык'
        }
      />
    </div>
  );
};

export const AdminListLoading = ({
  loading,
  hasData,
}: {
  loading: boolean;
  hasData: boolean;
}) => (
  <>
    {loading && (
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-primary"
      />
    )}
    {loading && !hasData && (
      <div aria-hidden="true" className="grid gap-2 py-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )}
  </>
);
