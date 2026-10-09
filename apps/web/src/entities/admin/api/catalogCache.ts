import type { CatalogKind } from '../model';

type Entry = {
  controller: AbortController;
  promise: Promise<unknown>;
  consumers: number;
  settled: boolean;
};
const entries = new Map<string, Entry>();
const listeners = new Set<(kind?: CatalogKind) => void>();
let sessionToken: string | null = null;
const abortError = () => new DOMException('Запрос отменён', 'AbortError');

export const subscribeAdminCatalogs = (
  listener: (kind?: CatalogKind) => void,
) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const invalidateAdminCatalogs = (kind?: CatalogKind, token?: string) => {
  if (token && token !== sessionToken) return;
  for (const [key, entry] of entries) {
    if (!kind || key.startsWith(`${kind}:`)) {
      entries.delete(key);
      entry.controller.abort();
    }
  }
  listeners.forEach((listener) => listener(kind));
};
export const setAdminCatalogSession = (token: string | null) => {
  if (sessionToken === token) return;
  sessionToken = token;
  invalidateAdminCatalogs();
};

export const primeAdminCatalogCache = <T>(
  token: string,
  key: string,
  value: T,
) => {
  if (sessionToken !== token || entries.has(key)) return;
  entries.set(key, {
    controller: new AbortController(),
    promise: Promise.resolve(value),
    consumers: 0,
    settled: true,
  });
};

// Each caller can cancel its wait without cancelling another subscriber's request.
export const readAdminCatalogCache = <T>(
  token: string,
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> => {
  if (signal?.aborted) return Promise.reject(signal.reason ?? abortError());
  setAdminCatalogSession(token);
  let entry = entries.get(key);
  if (!entry) {
    const controller = new AbortController();
    const created: Entry = {
      controller,
      consumers: 0,
      settled: false,
      promise: Promise.resolve()
        .then(() => {
          controller.signal.throwIfAborted();
          return load(controller.signal);
        })
        .then((value) => {
          controller.signal.throwIfAborted();
          created.settled = true;
          // Bound the number of cached searches within a long admin session.
          if (entries.size > 200) {
            for (const [oldKey, oldEntry] of entries) {
              if (oldEntry.settled && oldEntry.consumers === 0)
                entries.delete(oldKey);
              if (entries.size <= 200) break;
            }
          }
          return value;
        })
        .catch((error: unknown) => {
          if (entries.get(key) === created) entries.delete(key);
          throw error;
        }),
    };
    entries.set(key, created);
    entry = created;
  }
  const current = entry;
  current.consumers++;
  return new Promise<T>((resolve, reject) => {
    let finished = false;
    const finish = () => {
      if (finished) return false;
      finished = true;
      signal?.removeEventListener('abort', cancel);
      current.consumers--;
      // Strict Mode cleanup/re-subscribe shares the same pending request.
      queueMicrotask(() => {
        if (!current.settled && current.consumers === 0) {
          if (entries.get(key) === current) entries.delete(key);
          current.controller.abort();
        }
      });
      return true;
    };
    const cancel = () => {
      if (finish()) reject(signal?.reason ?? abortError());
    };
    signal?.addEventListener('abort', cancel, { once: true });
    current.promise.then(
      (value) => {
        if (finish()) resolve(value as T);
      },
      (error: unknown) => {
        if (finish()) reject(error);
      },
    );
  });
};
