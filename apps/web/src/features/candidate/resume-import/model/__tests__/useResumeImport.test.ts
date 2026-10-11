import { beforeEach, expect, it, vi } from 'vitest';

import { type ResumeImportResult } from '@/entities/candidate';

import { type ResumeImportOptions, useResumeImport } from '../useResumeImport';

const hooks = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effects: [] as (() => (() => void) | undefined)[],
}));
const api = vi.hoisted(() => ({
  importCandidateResume: vi.fn(),
  getCandidateExperiences: vi.fn(),
  getCandidateEducations: vi.fn(),
}));
vi.mock('@/entities/candidate', () => api);
vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  ensureClientAccessToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/shared/hooks', () => ({ useUnsavedChanges: vi.fn() }));
vi.mock('../../lib', () => ({
  getResumeChanges: vi.fn().mockReturnValue([]),
  getResumeFormPatches: vi.fn(),
  getResumeImportError: (error: Error) => error.message,
  getImportRetryAt: vi.fn(),
}));
vi.mock('react', () => ({
  useId: () => 'resume-input',
  useMemo: (factory: () => unknown) => factory(),
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [
      hooks.slots[index],
      (value: unknown) => {
        hooks.slots[index] =
          typeof value === 'function' ? value(hooks.slots[index]) : value;
      },
    ];
  },
  useEffect: (effect: () => (() => void) | undefined) =>
    hooks.effects.push(effect),
}));

const result = { draft: {}, warnings: [] } as unknown as ResumeImportResult;
let options: ResumeImportOptions;
const RenderImport = () => {
  const state = useResumeImport(options);
  return state;
};
const renderImport = () => {
  hooks.cursor = 0;
  hooks.effects = [];
  return RenderImport();
};
const selectFile = () => {
  renderImport().setFile({ size: 1024, name: 'resume.pdf' } as File);
  return renderImport();
};
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
beforeEach(() => {
  hooks.slots = [];
  hooks.cursor = 0;
  hooks.effects = [];
  vi.clearAllMocks();
  api.importCandidateResume.mockReset().mockResolvedValue(result);
  api.getCandidateExperiences.mockReset().mockResolvedValue({ items: [] });
  api.getCandidateEducations.mockReset().mockResolvedValue({ items: [] });
  options = {
    processing: true,
    busy: false,
    profileId: 'profile',
    getCurrentDraft: () => ({ profile: {}, contacts: {} }),
    onBusyChange: vi.fn(),
    onConsentRequired: vi.fn(),
    onApply: vi.fn(),
  };
});

it('reuses an imported result when refreshing profile records fails, without repeating the import POST', async () => {
  api.getCandidateEducations.mockRejectedValueOnce(new Error('offline'));
  await selectFile().upload();
  expect(renderImport().message).toBe('offline');
  expect(renderImport().review).toBeUndefined();
  await renderImport().upload();
  expect(api.importCandidateResume).toHaveBeenCalledTimes(1);
  expect(api.getCandidateEducations).toHaveBeenCalledTimes(2);
  expect(renderImport().review?.result).toBe(result);
});

it('aborts an in-flight import on unmount and ignores a late response', async () => {
  let resolve!: (value: ResumeImportResult) => void;
  api.importCandidateResume.mockImplementationOnce(
    () =>
      new Promise<ResumeImportResult>((done) => {
        resolve = done;
      }),
  );
  const state = selectFile();
  const cleanup = hooks.effects[0]();
  const uploading = state.upload();
  await flush();
  cleanup?.();
  expect(api.importCandidateResume.mock.calls[0][1].aborted).toBe(true);
  resolve(result);
  await uploading;
  expect(api.getCandidateExperiences).not.toHaveBeenCalled();
  expect(renderImport().review).toBeUndefined();
});

it('blocks a second upload while the first request is still running', async () => {
  let resolve!: (value: ResumeImportResult) => void;
  api.importCandidateResume.mockImplementationOnce(
    () =>
      new Promise<ResumeImportResult>((done) => {
        resolve = done;
      }),
  );
  const state = selectFile();
  const uploading = state.upload();
  await state.upload();
  await flush();
  expect(api.importCandidateResume).toHaveBeenCalledTimes(1);
  resolve(result);
  await uploading;
  expect(options.onBusyChange).toHaveBeenLastCalledWith(false);
});
