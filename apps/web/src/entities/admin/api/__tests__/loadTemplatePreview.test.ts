import { afterEach, expect, it, vi } from 'vitest';

import type { Template } from '../../model';
import { loadTemplatePreview } from '../loadTemplatePreview';

const template: Template = {
  id: 'template',
  stack_skill_id: 'skill',
  stack_name: 'TS',
  specialization_id: 1,
  grade_id: 1,
  version: 1,
  time_limit_sec: 300,
  pass_score: 70,
  status: 'draft',
  created_at: '',
  published_at: null,
  blueprint: [
    {
      skill_id: 'skill',
      skill_name: 'TS',
      difficulty: 1,
      question_count: 2,
      weight: 1,
      available: 2,
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());
it('loads only the pinned published version and reports shortages without creating attempts', async () => {
  const version = {
    version: 1,
    status: 'published',
    created_at: '',
    published_at: '',
    prompt: { text: 'Published prompt' },
    grading_spec: { type: 'text', accepted: ['const'] },
  };
  const question = {
    id: 'one',
    skill_id: 'skill',
    skill_name: 'TS',
    difficulty: 1,
    kind: 'short_answer',
    active: true,
    created_at: '',
    latest_version: 2,
    published_version: 1,
    versions: [
      {
        ...version,
        version: 2,
        status: 'draft',
        prompt: { text: 'Draft prompt' },
      },
      version,
    ],
  };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [question, { ...question, id: 'two' }],
          limit: 100,
          offset: 0,
          total: 2,
        }),
      ),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify(question)))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ ...question, id: 'two', active: false })),
    );
  vi.stubGlobal('fetch', fetch);
  const result = await loadTemplatePreview(
    'token',
    template,
    new AbortController().signal,
  );
  expect(result.questions).toHaveLength(1);
  expect(result.questions[0].version.prompt.text).toBe('Published prompt');
  expect(result.shortages).toEqual([
    { skill_id: 'skill', difficulty: 1, required: 2, available: 1 },
  ]);
  expect(
    fetch.mock.calls.every(([, options]) => options.method === 'GET'),
  ).toBe(true);
});
