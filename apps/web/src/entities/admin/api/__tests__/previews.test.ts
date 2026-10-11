import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  deleteAdminPreview,
  saveAdminPreviewAnswer,
  startAdminPreview,
  submitAdminPreview,
} from '../previews';

const preview = {
  id: 'p',
  template_id: 't',
  template_version: 1,
  status: 'in_progress',
  started_at: '2026-10-08T10:00:00Z',
  expires_at: '2026-10-08T10:05:00Z',
  server_time: '2026-10-08T10:00:00Z',
  finished_at: null,
  retain_until: '2026-10-15T10:00:00Z',
  time_limit_sec: 300,
  pass_score: 70,
  questions: [],
  result: null,
};
afterEach(() => vi.unstubAllGlobals());
describe('admin preview API', () => {
  it('reuses the supplied idempotency key and sends start without a body', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(preview), { status: 201 })),
      );
    vi.stubGlobal('fetch', fetch);
    await startAdminPreview('token', 't', 'stable-key');
    await startAdminPreview('token', 't', 'stable-key');
    for (const [url, options] of fetch.mock.calls) {
      expect(url).toBe('/api/v1/admin/assessments/templates/t/previews');
      expect(options.headers.get('Idempotency-Key')).toBe('stable-key');
      expect(options.body).toBeUndefined();
    }
  });
  it('saves using preview question ID and handles empty 204 for PUT and DELETE', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(null, { status: 204 })),
      );
    vi.stubGlobal('fetch', fetch);
    await expect(
      saveAdminPreviewAnswer('token', 'p', 'preview-q', { text: 'git status' }),
    ).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][0]).toBe(
      '/api/v1/admin/assessments/previews/p/answers/preview-q',
    );
    expect(fetch.mock.calls[0][1].method).toBe('PUT');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      text: 'git status',
    });
    await expect(deleteAdminPreview('token', 'p')).resolves.toBeUndefined();
  });
  it('keeps the server passed flag and defaults omitted false fields in result', async () => {
    const result = {
      ...preview,
      status: 'submitted',
      result: {
        score_percent: 90,
        pass_score: 70,
        passed: false,
        correct_count: 1,
        unanswered_count: 0,
        question_count: 2,
        skills: [],
        questions: [
          {
            id: 'q',
            correct: true,
            answered: true,
            correct_answer: { type: 'text', accepted: ['x'] },
          },
        ],
      },
    };
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(result)));
    vi.stubGlobal('fetch', fetch);
    const data = await submitAdminPreview('token', 'p');
    expect(data.result?.passed).toBe(false);
    expect(data.result?.questions[0].correct_answer.case_sensitive).toBe(false);
    expect(fetch.mock.calls[0][1].body).toBeUndefined();
  });
});
