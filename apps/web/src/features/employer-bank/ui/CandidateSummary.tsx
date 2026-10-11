import { pluralizeRu } from '@/shared/utils';
import type { Catalogs } from '@/entities/catalog';
import type { BankCandidate } from '@/entities/employer-bank';

interface CandidateSummaryProps {
  candidate: BankCandidate;
  catalogs: Catalogs;
}
export const CandidateSummary = ({
  candidate,
  catalogs,
}: CandidateSummaryProps) => {
  const years = Math.round((candidate.experienceMonths / 12) * 10) / 10;
  const category = candidate.category ?? candidate.declaredCategory;
  return (
    <div className="grid min-w-0 gap-3 [overflow-wrap:anywhere]">
      <p className="font-medium">
        {category
          ? [
              catalogs.specializations.find(
                (s) => s.id === category.specializationId,
              )?.name ?? 'Специализация не указана',
              catalogs.grades.find((g) => g.id === category.gradeId)?.name ??
                'Грейд не указан',
              category.stackName,
            ]
              .filter(Boolean)
              .join(' · ')
          : 'Категория не указана'}
      </p>
      <p
        className={
          candidate.gradeStatus === 'confirmed'
            ? 'text-sm text-success'
            : 'text-sm text-muted-foreground'
        }
      >
        {candidate.gradeStatus === 'confirmed'
          ? 'Грейд подтверждён тестом'
          : 'Грейд не подтверждён · самооценка'}
      </p>
      <p className="text-sm text-muted-foreground">
        Опыт: {pluralizeRu(years, ['год', 'года', 'лет'])} ·{' '}
        {candidate.searchStatus === 'open'
          ? 'Активно ищет работу'
          : 'Рассматривает предложения'}
      </p>
      <p className="text-sm">
        {candidate.city ?? 'Город не указан'} ·{' '}
        {candidate.timezone ?? 'Часовой пояс не указан'}
      </p>
      <p className="text-sm">
        {candidate.salaryMinRub === null
          ? 'Зарплата не указана'
          : `От ${candidate.salaryMinRub.toLocaleString('ru-RU')} ₽/мес`}
      </p>
      <p className="text-sm text-muted-foreground">
        {candidate.workFormatIds
          .map(
            (id) =>
              catalogs.workFormats.find((f) => f.id === id)?.name ??
              `Формат #${id}`,
          )
          .join(', ') || 'Формат не указан'}
      </p>
      {candidate.achievementsCount > 0 && (
        <p className="text-sm">Достижения ФСП: {candidate.achievementsCount}</p>
      )}
    </div>
  );
};
