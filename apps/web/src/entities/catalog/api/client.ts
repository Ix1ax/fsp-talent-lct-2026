import { clientApi } from '@/shared/api/client';

import type { Catalogs } from '../model';

export const getClientCatalogs = async (signal?: AbortSignal) => {
  const { data } = await clientApi.get<Catalogs>('/v1/catalogs', { signal });
  return data;
};

export { searchCatalogSkills } from './searchCatalogSkills';
