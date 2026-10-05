import 'server-only';

import { publicServerApi } from './server';

export type APIInfo = {
  name: string;
  version: string;
};

export const getAPIInfo = async (): Promise<APIInfo> => {
  const { data } = await publicServerApi.get<APIInfo>('/v1/info');
  return data;
};
