import { describe, expect, it, vi } from 'vitest';

import { createAnswerQueue } from '../createAnswerQueue';
import { getQuestionProgress } from '../getQuestionProgress';

describe('question progress', () => {
  it('does not count an autosaved answer until the question is left', () => {
    const queue = createAnswerQueue({ save: vi.fn(), onChange: vi.fn() });
    queue.initialize('q', { selected: ['a'] });
    expect(getQuestionProgress(queue.get('q'), false)).toBe('draft');
    expect(getQuestionProgress(queue.get('q'), true)).toBe('complete');
  });

  it('does not count skipped or whitespace-only answers', () => {
    const queue = createAnswerQueue({ save: vi.fn(), onChange: vi.fn() });
    queue.initialize('q', { text: '   ' });
    expect(getQuestionProgress(queue.get('q'), true)).toBe('empty');
    expect(getQuestionProgress(undefined, true)).toBe('empty');
  });

  it('does not count a changed answer while it is saving', async () => {
    let resolve!: () => void;
    const queue = createAnswerQueue({
      save: () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
      onChange: vi.fn(),
    });
    queue.initialize('q', { text: 'old' });
    queue.update('q', { text: 'new' });
    const pending = queue.flush('q');
    expect(getQuestionProgress(queue.get('q'), true)).toBe('saving');
    resolve();
    await pending;
    expect(getQuestionProgress(queue.get('q'), true)).toBe('complete');
  });

  it('keeps a failed answer pending until retry succeeds', async () => {
    const queue = createAnswerQueue({
      save: vi
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue(undefined),
      onChange: vi.fn(),
    });
    queue.initialize('q', { selected: [] });
    queue.update('q', { selected: ['a'] });
    await queue.flush('q');
    expect(getQuestionProgress(queue.get('q'), true)).toBe('pending');
    await queue.flush('q');
    expect(getQuestionProgress(queue.get('q'), true)).toBe('complete');
  });
});
