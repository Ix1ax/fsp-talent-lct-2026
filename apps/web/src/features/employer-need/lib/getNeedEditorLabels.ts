import type { NeedStatus } from '@/entities/employer-need';

export const getNeedStatusLabel = (status: NeedStatus, readonly?: boolean) => {
  if (readonly) return 'Только просмотр';
  if (status === 'active') return 'Активна';
  if (status === 'archived') return 'В архиве';

  return 'Черновик';
};

export const getNeedSaveLabel = (
  status: NeedStatus,
  pending: boolean,
  isNew?: boolean,
) => {
  if (pending) return 'Сохраняем…';
  if (isNew) return 'Создать и найти кандидатов';
  if (status === 'draft') return 'Активировать потребность';

  return 'Сохранить изменения';
};
