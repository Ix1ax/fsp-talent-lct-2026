import { briefTokenClassName } from '@/shared/ui';
import { formatSalaryRange } from '@/shared/utils';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { NeedInput } from '@/entities/employer-need';

interface NeedSummaryProps {
  value: NeedInput;
  catalogs: Catalogs;
  skills: Skill[];
}

interface SummaryTokenProps {
  value: string | undefined;
  fallback: string;
}

const SummaryToken = ({ value, fallback }: SummaryTokenProps) => (
  <span className={briefTokenClassName(!value)}>{value || fallback}</span>
);

export const NeedSummary = ({ value, catalogs, skills }: NeedSummaryProps) => {
  const skillNames = (required: boolean) =>
    value.skills
      .filter((item) => item.required === required)
      .map((item) => skills.find((skill) => skill.id === item.skillId)?.name)
      .filter(Boolean)
      .join(', ');
  const salaryEmpty =
    value.salaryFromRub === null && value.salaryToRub === null;

  return (
    <p className="text-xl leading-[2.6rem] text-pretty">
      Ищем специалиста{' '}
      <SummaryToken
        value={
          catalogs.specializations.find(
            (item) => item.id === value.specializationId,
          )?.name
        }
        fallback="специализация"
      />{' '}
      уровня{' '}
      <SummaryToken
        value={catalogs.grades.find((item) => item.id === value.gradeId)?.name}
        fallback="любой грейд"
      />
      , формат —{' '}
      <SummaryToken
        value={catalogs.workFormats
          .filter((item) => value.workFormatIds.includes(item.id))
          .map((item) => item.name.toLowerCase())
          .join(', ')}
        fallback="не указан"
      />
      , вилка{' '}
      <SummaryToken
        value={
          salaryEmpty
            ? undefined
            : formatSalaryRange(value.salaryFromRub, value.salaryToRub)
        }
        fallback="не указана"
      />
      . Обязательно —{' '}
      <SummaryToken value={skillNames(true)} fallback="не указано" />,
      желательно —{' '}
      <SummaryToken value={skillNames(false)} fallback="не указано" />.
    </p>
  );
};
