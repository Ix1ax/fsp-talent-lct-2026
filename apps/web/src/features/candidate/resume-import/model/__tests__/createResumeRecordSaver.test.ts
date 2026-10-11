import { describe, expect, it, vi } from 'vitest';

import { createResumeRecordSaver } from '../createResumeRecordSaver';

const setup = () => {
  const options = {
    isBusy: () => false,
    authenticate: vi.fn(async () => {}),
    onBusyChange: vi.fn(),
    onStatus: vi.fn(),
    onSaved: vi.fn(),
    getError: () => 'Save failed',
  };
  return { options, saver: createResumeRecordSaver(options) };
};
describe('saving imported records', () => {
  it('uses the current busy state and callbacks when other forms change', async () => {
    const { saver } = setup();
    const write = vi.fn(async () => ({ id: 'saved' }));
    const onSaved = vi.fn();
    expect(await saver.save(0, write, { isBusy: () => true, onSaved })).toBe(
      false,
    );
    expect(write).not.toHaveBeenCalled();
    expect(await saver.save(0, write, { isBusy: () => false, onSaved })).toBe(
      true,
    );
    expect(onSaved).toHaveBeenCalledOnce();
  });
  it('does not write after authentication failure and allows a later retry', async () => {
    const { options, saver } = setup();
    options.authenticate.mockRejectedValueOnce(
      new Error('Session unavailable'),
    );
    const write = vi.fn(async () => ({ id: 'saved' }));
    expect(await saver.save(0, write)).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(options.onStatus).toHaveBeenLastCalledWith(0, {
      error: 'Save failed',
    });
    expect(await saver.save(0, write)).toBe(true);
    expect(write).toHaveBeenCalledOnce();
  });
  it('marks a successful write before refreshing and never repeats it after reload failure', async () => {
    const { options, saver } = setup();
    options.onSaved.mockImplementation(() => {
      throw new Error('Reload failed');
    });
    const write = vi.fn(async () => ({ id: 'saved' }));
    expect(await saver.save(0, write)).toBe(true);
    saver.dismiss(0);
    expect(options.onStatus).toHaveBeenLastCalledWith(0, {
      savedId: 'saved',
      error:
        'Запись сохранена, но не удалось обновить профиль. Обновите страницу.',
    });
    expect(await saver.save(0, write)).toBe(false);
    expect(write).toHaveBeenCalledOnce();
  });
  it('retries only failed records after partial success', async () => {
    const { options, saver } = setup();
    const first = vi.fn(async () => ({ id: 'first' }));
    const second = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce({ id: 'second' });
    expect(await saver.save(0, first)).toBe(true);
    expect(await saver.save(1, second)).toBe(false);
    expect(await saver.save(0, first)).toBe(false);
    expect(await saver.save(1, second)).toBe(true);
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledTimes(2);
    expect(options.onSaved).toHaveBeenCalledTimes(2);
  });
  it('prevents simultaneous writes', async () => {
    const { saver } = setup();
    let resolve!: (value: { id: string }) => void;
    const write = vi.fn(
      () =>
        new Promise<{ id: string }>((done) => {
          resolve = done;
        }),
    );
    const first = saver.save(0, write);
    await Promise.resolve();
    expect(await saver.save(1, write)).toBe(false);
    resolve({ id: 'saved' });
    expect(await first).toBe(true);
    expect(write).toHaveBeenCalledOnce();
  });
});
