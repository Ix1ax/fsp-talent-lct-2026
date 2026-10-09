import type { NeedStatus } from '@/entities/employer-need';

export const getEmployerLocationState = (search: string) => {
  const params = new URLSearchParams(search);
  const offset = Number(params.get('offset') ?? 0);
  const tab = params.get('tab');
  const status: NeedStatus =
    tab === 'draft' || tab === 'archived' ? tab : 'active';
  const needId = params.get('need') ?? '';
  return {
    companyId: params.get('company') ?? '',
    status,
    offset:
      Number.isInteger(offset) && offset >= 0 && offset <= 10000 ? offset : 0,
    selectedId: /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(needId) ? needId : '',
  };
};
