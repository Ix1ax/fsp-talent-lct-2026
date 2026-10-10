import type { ReactNode } from 'react';
import { PencilIcon, Trash2Icon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import { Button } from './Button';

interface RecordItemProps {
  /** Главная строка: должность, учебное заведение, навык. */
  title: ReactNode;
  /** Вторая строка: компания, специальность. */
  subtitle?: ReactNode;
  /** Служебная строка: период, уровень, статус. */
  meta?: ReactNode;
  /** Бейджи рядом с заголовком. */
  badges?: ReactNode;
  /** Действия справа: редактирование, удаление, селект уровня. */
  actions?: ReactNode;
  /** Описание под шапкой записи. */
  children?: ReactNode;
  as?: 'li' | 'div' | 'section';
  className?: string;
}

/**
 * Запись списка в кабинете: опыт, образование, навык, согласие.
 * Иерархия всегда одна: заголовок → подзаголовок → служебная строка → описание.
 */
export const RecordItem = ({
  title,
  subtitle,
  meta,
  badges,
  actions,
  children,
  as: Component = 'li',
  className,
}: RecordItemProps) => (
  <Component
    className={cn(
      'flex min-w-0 flex-col gap-3 rounded-xl border border-border/60 bg-muted/50 p-4 sm:p-5',
      className,
    )}
  >
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="grid min-w-0 gap-1 [overflow-wrap:anywhere]">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{title}</h3>
          {badges}
        </div>
        {subtitle && <p className="text-sm">{subtitle}</p>}
        {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
    {children && (
      <div className="border-t border-border/60 pt-3 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
        {children}
      </div>
    )}
  </Component>
);

interface RecordItemActionsProps {
  /** Доступное имя записи для подписей кнопок: «место работы: Компания». */
  label: string;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/** Стандартные действия записи: «Изменить» и удаление иконкой. */
export const RecordItemActions = ({
  label,
  disabled,
  onEdit,
  onDelete,
}: RecordItemActionsProps) => (
  <>
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onEdit}
      aria-label={`Редактировать ${label}`}
    >
      <PencilIcon aria-hidden="true" />
      Изменить
    </Button>
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-destructive"
      disabled={disabled}
      onClick={onDelete}
      aria-label={`Удалить ${label}`}
    >
      <Trash2Icon aria-hidden="true" />
    </Button>
  </>
);
