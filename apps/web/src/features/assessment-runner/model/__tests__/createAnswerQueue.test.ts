import { describe, expect, it, vi } from 'vitest';

import { createAnswerQueue } from '../createAnswerQueue';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('answer queue', () => {
  it('serializes requests and saves the latest draft after an in-flight answer', async () => {
    const first = deferred();
    const save = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue(undefined);
    const queue = createAnswerQueue({ save, onChange: vi.fn() });
    queue.initialize('question', { text: '' });
    queue.update('question', { text: 'old' });
    const pending = queue.flush('question');
    queue.update('question', { text: 'new' });
    expect(queue.flush('question')).toBe(pending);
    expect(save).toHaveBeenCalledTimes(1);
    first.resolve();
    expect(await pending).toBe(true);
    expect(save.mock.calls).toEqual([
      ['question', { text: 'old' }],
      ['question', { text: 'new' }],
    ]);
    expect(queue.dirty()).toBe(false);
  });
  it('keeps drafts after errors and flushes them on retry', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const queue = createAnswerQueue({ save, onChange: vi.fn() });
    queue.initialize('question', { selected: [] });
    queue.update('question', { selected: ['a'] });
    expect(await queue.flushAll()).toBe(false);
    expect(queue.get('question')?.answer).toEqual({ selected: ['a'] });
    expect(queue.dirty()).toBe(true);
    expect(await queue.flushAll()).toBe(true);
    expect(queue.dirty()).toBe(false);
  });
  it('waits for every question before completion', async () => {
    const slow = deferred();
    const queue = createAnswerQueue({
      save: vi.fn().mockReturnValue(slow.promise),
      onChange: vi.fn(),
    });
    queue.initialize('question', { text: '' });
    queue.update('question', { text: 'answer' });
    let complete = false;
    const flush = queue.flushAll().then(() => {
      complete = true;
    });
    await Promise.resolve();
    expect(complete).toBe(false);
    slow.resolve();
    await flush;
    expect(complete).toBe(true);
  });
});
