import type { EmployerNeed, NeedStatus } from '@/entities/employer-need';

type SearchPage = {
  items: EmployerNeed[];
  hasMore?: boolean;
};

export type NeedsSearchApi = {
  needs: (
    companyId: string,
    status: NeedStatus,
    offset: number,
    signal?: AbortSignal,
  ) => Promise<SearchPage>;
};
