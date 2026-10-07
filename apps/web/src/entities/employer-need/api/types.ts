import type { archiveNeed, createNeed, updateNeed } from './needs';

export type NeedMutationApi = {
  createNeed: typeof createNeed;
  updateNeed: typeof updateNeed;
  archiveNeed: typeof archiveNeed;
};
