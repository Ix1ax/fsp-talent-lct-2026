import {
  CheckIcon,
  CircleHelpIcon,
  MinusIcon,
  ShieldCheckIcon,
  XIcon,
} from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import type { Recommendation } from '@/entities/employer-need';

type Criterion = NonNullable<Recommendation['criteria']>[number];
type Skill = NonNullable<Recommendation['skills']>[number];

export const MATCH_CONDITION_LABELS: Record<string, string> = {
  work_format: 'Формат работы',
  specialization: 'Специализация',
  grade: 'Грейд',
  skills: 'Навыки',
  salary: 'Зарплата',
  city: 'Город',
  timezone: 'Часовой пояс',
};

const CRITERION_VIEW: Record<
  Criterion['status'],
  { label: string; icon: typeof CheckIcon; className: string }
> = {
  matched: {
    label: 'совпадает',
    icon: CheckIcon,
    className: 'bg-success-soft text-success',
  },
  partial: {
    label: 'частично',
    icon: MinusIcon,
    className: 'bg-warning-soft text-warning',
  },
  mismatched: {
    label: 'не совпадает',
    icon: XIcon,
    className: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  },
  unknown: {
    label: 'нет данных',
    icon: CircleHelpIcon,
    className: 'bg-muted text-muted-foreground',
  },
};

// Сначала совпадения, затем частичные, расхождения и неизвестное.
const ORDER: Criterion['status'][] = [
  'matched',
  'partial',
  'mismatched',
  'unknown',
];

const pillClassName =
  'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium [&_svg]:size-3.5 [&_svg]:shrink-0';

interface CriteriaPillsProps {
  criteria: Criterion[];
}

export const CriteriaPills = ({ criteria }: CriteriaPillsProps) => {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Условия потребности">
      {[...criteria]
        .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
        .map((item) => {
          const view = CRITERION_VIEW[item.status];
          const label = MATCH_CONDITION_LABELS[item.code] ?? item.code;
          return (
            <li
              key={item.code}
              className={cn(pillClassName, view.className)}
              title={`${label}: ${view.label}`}
            >
              <view.icon aria-hidden="true" />
              {label}
              <span className="sr-only">: {view.label}</span>
            </li>
          );
        })}
    </ul>
  );
};

const SKILL_VIEW: Record<
  Skill['source'],
  { label: string; className: string }
> = {
  test: {
    label: 'подтверждён тестом',
    className: 'border-success/30 bg-success-soft text-success',
  },
  claimed: {
    label: 'заявлен кандидатом',
    className: 'border-border bg-card text-foreground',
  },
  missing: {
    label: 'нет данных',
    className: 'border-dashed border-border text-muted-foreground',
  },
};

interface SkillPillsProps {
  skills: Skill[];
}

export const SkillPills = ({ skills }: SkillPillsProps) => {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Навыки потребности">
      {skills.map((skill) => {
        const view = SKILL_VIEW[skill.source];
        return (
          <li
            key={skill.id}
            className={cn(pillClassName, 'border', view.className)}
            title={`${skill.name}: ${view.label}${skill.required ? ', обязательный' : ''}`}
          >
            {skill.source === 'test' && <ShieldCheckIcon aria-hidden="true" />}
            {skill.name}
            {skill.required && (
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            )}
            <span className="sr-only">
              : {view.label}
              {skill.required ? ', обязательный' : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
