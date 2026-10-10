import type { EmployerNeed, NeedStatus } from '@/entities/employer-need';
type SearchPage = {
  items: EmployerNeed[];
  hasMore?: boolean;
};
export interface NeedsSearchApi {
  needs: (
    companyId: string,
    status: NeedStatus,
    offset: number,
    signal?: AbortSignal,
  ) => Promise<SearchPage>;
}
/** Временный поиск по компании до появления серверного индекса. */
export const loadSearchNeeds = async (
  api: NeedsSearchApi,
  companyId: string,
  signal: AbortSignal,
): Promise<EmployerNeed[]> => {
  const groups = await Promise.all(
    (['active', 'draft', 'archived'] as const).map(async (status) => {
      const items: EmployerNeed[] = [];
      for (let offset = 0; offset <= 10000; offset += 20) {
        signal.throwIfAborted();
        const page = await api.needs(companyId, status, offset, signal);
        items.push(...page.items);
        if (page.hasMore === false || page.items.length < 20) return items;
      }
      throw new Error(
        'Компания слишком велика для локального поиска. Нужен серверный поиск.',
      );
    }),
  );
  signal.throwIfAborted();
  return groups.flat();
};
export const filterSearchNeeds = (items: EmployerNeed[], query: string) => {
  const normalized = query.trim().toLocaleLowerCase('ru');
  return items.filter((need) =>
    need.title.toLocaleLowerCase('ru').includes(normalized),
  );
};
