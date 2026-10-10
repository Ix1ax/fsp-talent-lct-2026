import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  useId,
  useState,
} from 'react';

import {
  Button,
  Combobox,
  Input,
  Label,
  RemoteState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from '@/shared/ui';
import {
  AdminApiError,
  type CatalogItem,
  statusLabels,
} from '@/entities/admin';

import { useAdminSkillSearch } from '../model';

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
}: FieldProps) => {
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const controls = Children.map(children, (child) => {
    if (
      !isValidElement<{
        'aria-describedby'?: string;
        'aria-labelledby'?: string;
        'aria-invalid'?: boolean;
      }>(child) ||
      (child.type !== Input && child.type !== Textarea)
    )
      return child;
    return cloneElement(child, {
      'aria-labelledby': labelId,
      'aria-invalid': child.props['aria-invalid'] ?? !!error,
      'aria-describedby':
        [child.props['aria-describedby'], error ? errorId : undefined]
          .filter(Boolean)
          .join(' ') || undefined,
    });
  });
  return (
    <label
      data-admin-field
      className="grid min-w-0 content-start gap-1.5 text-sm [&_input]:h-11 [&_input]:text-base [&_textarea]:text-base sm:[&_input]:text-sm sm:[&_textarea]:text-sm"
    >
      <span id={labelId} className="min-h-5 font-medium leading-5">
        {label}
      </span>
      {controls}
      {(reserveErrorSpace || error) && (
        <span
          id={errorId}
          role={error ? 'alert' : undefined}
          className="min-h-4 text-xs text-destructive"
        >
          {error}
        </span>
      )}
    </label>
  );
};
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
interface ErrorNoticeProps {
  error: unknown;
  onRetry?: () => void;
}
export const ErrorNotice = ({ error, onRetry }: ErrorNoticeProps) => {
  if (!error) return null;
  const message =
    error instanceof Error ? error.message : 'Не удалось выполнить запрос';
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive wrap-anywhere"
    >
      {message}
      {onRetry && (
        <Button
          variant="outline"
          className="mt-3 min-h-11 w-fit bg-background text-foreground"
          onClick={onRetry}
        >
          Повторить загрузку
        </Button>
      )}
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
export const Status = ({ value }: { value: string }) => {
  return (
    <span
      className={`inline-flex min-h-7 max-w-full shrink-0 items-center justify-center whitespace-normal border px-2 py-1 text-center text-xs ${value === 'published' || value === 'approved' || value === 'active' ? 'border-success/30 bg-success-soft text-success' : 'border-border bg-muted text-muted-foreground'}`}
    >
      {statusLabels[value] ?? value}
    </span>
  );
};
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
}: PaginationProps) => {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm tabular-nums">
      <span className="text-muted-foreground">
        {count ? `${offset + 1}–${offset + count}` : 'Нет записей'}
        {total !== undefined && ` из ${total}`}
      </span>
      {(offset > 0 || count >= 20 || (total ?? 0) > 20) && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-11"
            disabled={loading || offset === 0}
            onClick={() => onChange(Math.max(0, offset - 20))}
          >
            Назад
          </Button>
          <Button
            variant="outline"
            className="h-11"
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
};
interface SkillPickerProps {
  value: string;
  onChange: (value: string) => void;
  items?: CatalogItem[];
  approvedOnly?: boolean;
  excludeId?: string;
  label?: string;
  disabled?: boolean;
  error?: string;
}
export const SkillPicker = ({
  value,
  onChange,
  items = [],
  approvedOnly = false,
  excludeId,
  label = 'Навык',
  disabled,
  error,
}: SkillPickerProps) => {
  const id = useId();
  const [query, setQuery] = useState('');
  const search = useAdminSkillSearch(query.trim(), value);
  const selected = search.selected ?? items.find((item) => item.id === value);
  const unavailable =
    selected &&
    (selected.active === false ||
      (approvedOnly && selected.moderation_status !== 'approved'));
  let selectedLabel: string | undefined;
  if (value) {
    selectedLabel = selected?.name ?? `Навык ${value}`;
    if (unavailable) selectedLabel += ' (недоступен)';
  }
  const choices = search.items.filter(
    (item) =>
      item.id !== excludeId &&
      (!approvedOnly ||
        (item.active !== false && item.moderation_status === 'approved')),
  );
  return (
    <div
      data-admin-field
      className="grid min-w-0 content-start gap-1.5 text-sm [&_button[role=combobox]]:h-11 [&_button[role=combobox]]:min-w-0 [&_button[role=combobox]]:text-base [&_button[role=combobox]>span]:min-w-0 [&_button[role=combobox]>span]:flex-1 [&_button[role=combobox]>span]:text-left sm:[&_button[role=combobox]]:text-sm"
    >
      <Label htmlFor={id} className="min-h-5 leading-5">
        {label}
      </Label>
      <Combobox
        id={id}
        options={choices.map((item) => ({
          value: item.id,
          label: `${item.name}${item.active === false ? ' (архив)' : ''}`,
          keywords: [item.code, ...(item.aliases ?? [])],
        }))}
        value={value}
        selectedLabel={selectedLabel}
        onValueChange={onChange}
        onSearchChange={setQuery}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={`${id}-feedback`}
        placeholder="Выберите навык"
        searchPlaceholder="Поиск навыка на сервере…"
        emptyMessage={
          search.loading ? 'Ищем навыки…' : 'Ничего не найдено. Уточните поиск.'
        }
      />
      <div id={`${id}-feedback`} className="grid min-h-4 content-start gap-1.5">
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Показано до 50 навыков. Для других значений уточните поиск.
        </p>
        <ErrorNotice error={search.error} onRetry={search.retry} />
      </div>
    </div>
  );
};

interface AdminListLoadingProps {
  loading: boolean;
  hasData: boolean;
}

export const AdminListLoading = ({
  loading,
  hasData,
}: AdminListLoadingProps) => {
  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-4 top-0 h-0.5 bg-primary transition-opacity duration-200 motion-reduce:transition-none sm:inset-x-6 ${loading ? 'opacity-100' : 'opacity-0'}`}
      />
      {loading && !hasData && (
        <RemoteState
          loading
          loadingLabel="Загрузка списка"
          loadingContent={
            <div className="grid gap-2 py-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          }
        />
      )}
    </>
  );
};
