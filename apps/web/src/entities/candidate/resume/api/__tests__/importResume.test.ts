import { afterEach, describe, expect, it, vi } from 'vitest';

import { clientApi } from '@/shared/api';
import { createApi } from '@/shared/api/base';

import { importCandidateResume } from '../importResume';

describe('resume import request', () => {
  afterEach(() => vi.restoreAllMocks());
  it('sends only the file in FormData and supports cancellation', async () => {
    const post = vi
      .spyOn(clientApi, 'post')
      .mockResolvedValue({ data: { draft: {}, warnings: ['Check'] } });
    const file = new File(['resume'], 'hh.pdf', { type: 'application/pdf' });
    const controller = new AbortController();
    const result = await importCandidateResume(file, controller.signal);
    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('/v1/me/profile/import/resume');
    expect(body).toBeInstanceOf(FormData);
    expect([...(body as FormData).keys()]).toEqual(['file']);
    expect((body as FormData).get('file')).toBe(file);
    expect(config).toMatchObject({ signal: controller.signal });
    expect(result.warnings).toEqual(['Check']);
  });
  it('preserves multipart data through the shared request converter', async () => {
    const file = new File(['text'], 'hh.pdf', { type: 'application/pdf' });
    const body = new FormData();
    body.append('file', file);
    const api = createApi({
      adapter: async (config) => {
        expect(config.data).toBe(body);
        expect(config.data.get('file')).toBe(file);
        return {
          data: { draft: { salary_min_rub: 100000 }, warnings: [] },
          status: 200,
          statusText: 'OK',
          config,
          headers: {},
        };
      },
    });
    const response = await api.post('/resume', body);
    expect(response.data.draft.salaryMinRub).toBe(100000);
  });
});
