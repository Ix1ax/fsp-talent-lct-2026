import { formatSalaryRange } from '@/shared/utils';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { NeedInput } from '@/entities/employer-need';

interface NeedSummaryProps {
  value: NeedInput;
  catalogs: Catalogs;
  skills: Skill[];
}

export const NeedSummary = ({ value, catalogs, skills }: NeedSummaryProps) => {
  const skillNames = (required: boolean) =>
    value.skills
      .filter((item) => item.required === required)
      .map(
        (item) =>
          skills.find((skill) => skill.id === item.skillId)?.name ??
          `Сохранённый навык ${item.skillId}`,
      )
      .filter(Boolean)
      .join(', ');
  const fields = [
    [
      'Специализация',
      catalogs.specializations.find(
        (item) => item.id === value.specializationId,
      )?.name ??
        (value.specializationId
          ? `Сохранённая специализация #${value.specializationId}`
          : null),
    ],
    [
      'Грейд',
      catalogs.grades.find((item) => item.id === value.gradeId)?.name ??
        (value.gradeId ? `Сохранённый грейд #${value.gradeId}` : 'Любой грейд'),
    ],
    [
      'Формат работы',
      value.workFormatIds
        .map(
          (id) =>
            catalogs.workFormats.find((item) => item.id === id)?.name ??
            `Сохранённый формат #${id}`,
        )
        .join(', '),
    ],
    ['Город', value.city ?? 'Любой город'],
    ['Часовой пояс', value.timezone],
    ['Зарплата', formatSalaryRange(value.salaryFromRub, value.salaryToRub)],
    ['Обязательные навыки', skillNames(true)],
    ['Желательные навыки', skillNames(false)],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {fields.map(([label, content]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-sm leading-relaxed wrap-anywhere">
            {content || 'Не указано'}
          </dd>
        </div>
      ))}
    </dl>
  );
};
