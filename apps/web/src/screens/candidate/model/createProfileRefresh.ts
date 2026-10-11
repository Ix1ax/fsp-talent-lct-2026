import type { CandidateFullProfile } from '@/entities/candidate';

type Options = {
  load: (signal: AbortSignal) => Promise<CandidateFullProfile>;
  apply: (profile: CandidateFullProfile) => void;
};

export const createProfileRefresh = ({ load, apply }: Options) => {
  let revision = 0;
  let request = 0;
  let controller: AbortController | undefined;

  const invalidate = () => {
    revision += 1;
    controller?.abort();
  };
  const refresh = async (signal?: AbortSignal) => {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    const version = revision;
    const id = ++request;
    const abort = () => current.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) current.abort();
    try {
      if (current.signal.aborted) return;
      const latest = await load(current.signal);
      if (!current.signal.aborted && version === revision && id === request)
        apply(latest);
    } catch (error) {
      if (!current.signal.aborted && version === revision && id === request)
        throw error;
    } finally {
      signal?.removeEventListener('abort', abort);
      if (controller === current) controller = undefined;
    }
  };
  return { invalidate, refresh };
};
