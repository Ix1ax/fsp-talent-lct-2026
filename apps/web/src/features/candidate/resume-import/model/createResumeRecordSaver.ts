import type { ResumeRecordStatus } from './types';

type ResumeRecordSaverOptions = {
  isBusy: () => boolean;
  authenticate: () => Promise<unknown>;
  onBusyChange: (busy: boolean) => void;
  onStatus: (index: number, status: ResumeRecordStatus) => void;
  onSaved: () => void;
  getError: (error: unknown) => string;
};

export const createResumeRecordSaver = (options: ResumeRecordSaverOptions) => {
  let running = false;
  const completed = new Set<number>();
  const save = async (
    index: number,
    action: () => Promise<{ id: string }>,
    callbacks?: Partial<
      Pick<ResumeRecordSaverOptions, 'isBusy' | 'onBusyChange' | 'onSaved'>
    >,
  ) => {
    const current = { ...options, ...callbacks };
    if (current.isBusy() || running || completed.has(index)) return false;
    running = true;
    current.onBusyChange(true);
    options.onStatus(index, {});
    let savedId: string;
    try {
      await options.authenticate();
      const record = await action();
      savedId = record.id;
      completed.add(index);
      options.onStatus(index, { savedId: record.id });
    } catch (error) {
      options.onStatus(index, { error: options.getError(error) });
      return false;
    } finally {
      running = false;
      current.onBusyChange(false);
    }
    // Reload failures cannot turn a completed write into a retryable POST.
    try {
      current.onSaved();
    } catch {
      options.onStatus(index, {
        savedId,
        error:
          'Запись сохранена, но не удалось обновить профиль. Обновите страницу.',
      });
    }
    return true;
  };
  return {
    save,
    dismiss: (index: number) => {
      if (!completed.has(index)) options.onStatus(index, { dismissed: true });
    },
  };
};
