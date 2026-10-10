import type { NeedStatus } from './types';

export const NEED_STATUS_LABELS: Record<NeedStatus, string> = {
  active: 'Активные',
  draft: 'Черновики',
  archived: 'Архив',
};

export const NEED_DETAIL_STATUS_LABELS: Record<NeedStatus, string> = {
  active: 'Активна',
  draft: 'Черновик',
  archived: 'В архиве',
};
