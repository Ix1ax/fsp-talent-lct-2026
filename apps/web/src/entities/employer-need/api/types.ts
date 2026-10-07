import type { archiveNeed, createNeed, updateNeed } from './needs';
export interface NeedMutationApi {
  createNeed: typeof createNeed;
  updateNeed: typeof updateNeed;
  archiveNeed: typeof archiveNeed;
}
