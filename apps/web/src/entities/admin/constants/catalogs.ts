import type { CatalogKind } from '../model';

export const catalogKinds = [
  'specializations',
  'skills',
  'grades',
  'work_formats',
] as const;

export const catalogLabels: Record<CatalogKind, string> = {
  specializations: 'Специализации',
  skills: 'Навыки',
  grades: 'Грейды',
  work_formats: 'Форматы работы',
};
export const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'Архив',
  pending: 'На модерации',
  approved: 'Одобрен',
  rejected: 'Отклонён',
  merged: 'Объединён',
  active: 'Активен',
  blocked: 'Заблокирован',
};
export const kindLabels = {
  choice: 'Выбор ответа',
  short_answer: 'Короткий ответ',
  code_reading: 'Чтение кода',
};
