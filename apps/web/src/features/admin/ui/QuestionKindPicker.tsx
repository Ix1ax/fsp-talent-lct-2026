import { CodeXmlIcon, ListChecksIcon, TextCursorInputIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import type { QuestionKind } from '@/entities/admin';

const KINDS: {
  value: QuestionKind;
  label: string;
  hint: string;
  icon: typeof ListChecksIcon;
}[] = [
  {
    value: 'choice',
    label: 'Выбор ответа',
    hint: 'Один или несколько верных вариантов',
    icon: ListChecksIcon,
  },
  {
    value: 'short_answer',
    label: 'Короткий ответ',
    hint: 'Кандидат вводит ответ сам',
    icon: TextCursorInputIcon,
  },
  {
    value: 'code_reading',
    label: 'Чтение кода',
    hint: 'Фрагмент кода и вопрос к нему',
    icon: CodeXmlIcon,
  },
];

interface QuestionKindPickerProps {
  value: QuestionKind;
  disabled?: boolean;
  onChange: (value: QuestionKind) => void;
}

/** Тип задания карточками: сразу видно, чем типы отличаются. */
export const QuestionKindPicker = ({
  value,
  disabled,
  onChange,
}: QuestionKindPickerProps) => (
  <div
    role="radiogroup"
    aria-label="Тип задания"
    className="grid gap-2 sm:grid-cols-3"
  >
    {KINDS.map((kind) => {
      const active = kind.value === value;
      return (
        <button
          key={kind.value}
          type="button"
          role="radio"
          aria-checked={active}
          disabled={disabled && !active}
          onClick={() => onChange(kind.value)}
          className={cn(
            'grid min-w-0 content-start gap-1 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40',
            active
              ? 'border-primary bg-accent'
              : 'border-border bg-card hover:border-primary/40',
            disabled && active && 'cursor-default',
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <kind.icon
              aria-hidden="true"
              className={cn(
                'size-4 shrink-0',
                active ? 'text-brand-text' : 'text-muted-foreground',
              )}
            />
            {kind.label}
          </span>
          <span className="text-xs leading-snug text-muted-foreground">
            {kind.hint}
          </span>
        </button>
      );
    })}
  </div>
);

interface DifficultyPickerProps {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

/** Сложность 1–5 сегментами вместо числового поля. */
export const DifficultyPicker = ({
  value,
  disabled,
  onChange,
}: DifficultyPickerProps) => (
  <div
    role="radiogroup"
    aria-label="Сложность"
    className="grid grid-cols-5 gap-1 rounded-xl bg-muted p-1"
  >
    {[1, 2, 3, 4, 5].map((level) => {
      const active = level === value;
      return (
        <button
          key={level}
          type="button"
          role="radio"
          aria-checked={active}
          aria-label={`Сложность ${level} из 5`}
          disabled={disabled && !active}
          onClick={() => onChange(level)}
          className={cn(
            'min-h-9! rounded-lg text-sm font-medium tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40',
            active
              ? 'bg-card text-brand-text shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {level}
        </button>
      );
    })}
  </div>
);
