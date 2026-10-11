import { describe, expect, it } from 'vitest';

import type { PreviewQuestion } from '@/entities/admin';

import {
  equalPreviewAnswers,
  getPreviewAnswerIssue,
  previewSecondsRemaining,
} from '../previewAnswer';

const question: PreviewQuestion = {
  id: 'preview-q',
  question_id: 'bank-q',
  position: 1,
  version: 1,
  skill_id: 's',
  skill_name: 'Git',
  difficulty: 1,
  weight: 1,
  kind: 'code_reading',
  prompt: { text: 'command?', code: 'git status' },
  answer_form: { type: 'text', multiple: false },
  answer: null,
};
describe('server preview answers', () => {
  it('counts Unicode characters and forbids empty and NUL text', () => {
    expect(
      getPreviewAnswerIssue(question, { text: '🙂'.repeat(500) }),
    ).toBeNull();
    expect(
      getPreviewAnswerIssue(question, { text: '🙂'.repeat(501) }),
    ).toBeTruthy();
    expect(getPreviewAnswerIssue(question, { text: '  ' })).toBeTruthy();
    expect(
      getPreviewAnswerIssue(question, { text: 'git\0status' }),
    ).toBeTruthy();
  });
  it('uses answer_form for code reading and rejects unknown, duplicate and extra choices', () => {
    const choice = {
      ...question,
      answer_form: { type: 'choice' as const, multiple: false },
      prompt: {
        text: 'x',
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
      },
    };
    expect(getPreviewAnswerIssue(choice, { selected: ['a'] })).toBeNull();
    for (const selected of [[], ['a', 'a'], ['x'], ['a', 'b']])
      expect(getPreviewAnswerIssue(choice, { selected })).toBeTruthy();
  });
  it('compares choice sets but preserves text changes', () => {
    expect(
      equalPreviewAnswers({ selected: ['b', 'a'] }, { selected: ['a', 'b'] }),
    ).toBe(true);
    expect(equalPreviewAnswers({ text: ' a' }, { text: 'a' })).toBe(false);
    expect(equalPreviewAnswers(null, {})).toBe(true);
  });
  it('anchors countdown to server time rather than the device wall clock', () => {
    expect(
      previewSecondsRemaining(
        '2026-10-08T10:05:00Z',
        '2026-10-08T10:00:00Z',
        1500,
      ),
    ).toBe(299);
    expect(
      previewSecondsRemaining(
        '2026-10-08T10:05:00Z',
        '2026-10-08T10:00:00Z',
        400000,
      ),
    ).toBe(0);
  });
});
