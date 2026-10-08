import type { EducationLevel } from '@/entities/candidate';

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  secondary: 'Среднее общее',
  vocational: 'Среднее профессиональное',
  incomplete_higher: 'Неоконченное высшее',
  higher: 'Высшее',
  bachelor: 'Бакалавриат',
  master: 'Магистратура',
  phd: 'Кандидат наук',
  doctor: 'Доктор наук',
};
