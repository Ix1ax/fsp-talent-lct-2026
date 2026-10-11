import 'server-only';

import { publicServerApi } from '@/shared/api/server';

import type { Catalogs } from '../model';

export const getCatalogs = async (): Promise<Catalogs> => {
  const { data } = await publicServerApi.get<Catalogs>('/v1/catalogs');

  return data;
};
