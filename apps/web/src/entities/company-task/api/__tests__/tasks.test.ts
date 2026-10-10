import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adapter, ensure } = vi.hoisted(() => ({
  adapter: vi.fn(),
  ensure: vi.fn(),
}));

vi.mock('@/shared/api', async () => {
  const { createApi } = await import('@/shared/api/base');
  return { clientApi: createApi({ adapter }), ensureClientAccessToken: ensure };
});

import {
  downloadMyTaskSolution,
  getMyTaskSubmission,
  listMyTaskSubmissions,
  listTasks,
  submitTaskSolution,
} from '../tasks';

beforeEach(() => {
  adapter.mockReset();
  ensure.mockReset();
  adapter.mockImplementation(async (config) => ({
    data: { id: 'submission', task_id: 'task', score: 0, feedback: null },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
});

describe('candidate tasks API', () => {
  it('sends exactly one file with no candidate identity or extra fields', async () => {
    const file = new File(['answer'], 'solution.txt');
    const result = await submitTaskSolution('task', file);
    const config = adapter.mock.calls[0][0];
    expect(ensure).toHaveBeenCalledOnce();
    expect(config.url).toBe('/v1/tasks/task/submissions');
    expect(config.method).toBe('post');
    expect([...config.data.keys()]).toEqual(['file']);
    expect(config.data.get('file')).toBe(file);
    expect(result).toMatchObject({ taskId: 'task', score: 0 });
  });
  it('normalizes filters and keeps history independent of consent', async () => {
    await listMyTaskSubmissions(
      { status: 'reviewed', sort: 'score', taskId: 'task' },
      20,
    );
    expect(adapter.mock.calls[0][0].params).toEqual({
      status: 'reviewed',
      sort: 'score',
      task_id: 'task',
      limit: 20,
      offset: 20,
    });
    await getMyTaskSubmission('submission');
    expect(adapter.mock.calls[1][0].url).toBe(
      '/v1/me/task-submissions/submission',
    );
  });
  it('does not issue a cancelled list request', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(listTasks({}, 0, controller.signal)).rejects.toBeTruthy();
    expect(adapter).not.toHaveBeenCalled();
  });
  it('downloads private files as blobs', async () => {
    await downloadMyTaskSolution('submission');
    expect(adapter.mock.calls[0][0]).toMatchObject({
      url: '/v1/me/task-submissions/submission/file',
      responseType: 'blob',
    });
  });
});
