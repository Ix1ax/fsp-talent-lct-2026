import { TIMEZONE_LABELS } from '@/shared/contants';
import { formatSalaryRange, pluralizeRu } from '@/shared/utils';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { NeedInput } from '@/entities/employer-need';

interface NeedSummaryProps {
  value: NeedInput;
  catalogs: Catalogs;
  skills: Skill[];
}

interface SummaryTokenProps {
  value: string | null | undefined;
  fallback: string;
}

const SummaryToken = ({ value, fallback }: SummaryTokenProps) => {
  return (
    <span
      className={
        value ? 'font-medium text-foreground' : 'text-muted-foreground'
      }
    >
      {value || fallback}
    </span>
  );
};

/** Бриф потребности одной фразой: значения справочника — токены. */
export const NeedSummary = ({ value, catalogs, skills }: NeedSummaryProps) => {
  // Потребность хранит только ID навыков: без названий показываем количество,
  // а не технический идентификатор.
  const skillNames = (required: boolean) => {
    const selected = value.skills.filter((item) => item.required === required);
    const names = selected
      .map((item) => skills.find((skill) => skill.id === item.skillId)?.name)
      .filter((name): name is string => !!name);
    if (!selected.length) return '';
    return names.length === selected.length
      ? names.join(', ')
      : pluralizeRu(selected.length, ['навык', 'навыка', 'навыков']);
  };
  const specialization =
    catalogs.specializations.find((item) => item.id === value.specializationId)
      ?.name ??
    (value.specializationId
      ? `Сохранённая специализация #${value.specializationId}`
      : null);
  const grade =
    catalogs.grades.find((item) => item.id === value.gradeId)?.name ??
    (value.gradeId ? `Сохранённый грейд #${value.gradeId}` : null);
  const formats = value.workFormatIds
    .map(
      (id) =>
        catalogs.workFormats
          .find((item) => item.id === id)
          ?.name.toLowerCase() ?? `сохранённый формат #${id}`,
    )
    .join(', ');
  const salary =
    value.salaryFromRub === null && value.salaryToRub === null
      ? null
      : formatSalaryRange(value.salaryFromRub, value.salaryToRub);
  const timezone = value.timezone
    ? (TIMEZONE_LABELS[value.timezone] ?? value.timezone)
    : null;

  return (
    <p className="text-base leading-8 text-pretty text-muted-foreground">
      Ищем специалиста{' '}
      <SummaryToken value={specialization} fallback="специализация" /> уровня{' '}
      <SummaryToken value={grade} fallback="любой грейд" />, формат —{' '}
      <SummaryToken value={formats} fallback="не указан" />, город{' '}
      <SummaryToken value={value.city} fallback="любой" />, часовой пояс{' '}
      <SummaryToken value={timezone} fallback="любой" />, вилка{' '}
      <SummaryToken value={salary} fallback="не указана" />. Обязательно —{' '}
      <SummaryToken value={skillNames(true)} fallback="не указано" />,
      желательно —{' '}
      <SummaryToken value={skillNames(false)} fallback="не указано" />.
    </p>
  );
};
