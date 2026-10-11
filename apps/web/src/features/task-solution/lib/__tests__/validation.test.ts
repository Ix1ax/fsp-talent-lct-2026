import { createFormControl } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { describe, expect, it, vi } from 'vitest';

import {
  type SolutionFormValues,
  solutionSchema,
} from '../../constants/schema';
import {
  isTaskOpen,
  MAX_SOLUTION_SIZE,
  validateSolutionFile,
} from '../validation';

describe('task solution validation', () => {
  it('rejects submission after clearing a previously selected file', async () => {
    const form = createFormControl<SolutionFormValues>({
      resolver: zodResolver(solutionSchema),
      defaultValues: { confirmed: false },
    });
    form.register('file');
    form.setValue('file', new File(['solution'], 'solution.txt'));
    form.setValue('confirmed', true);

    const submit = vi.fn();
    await form.handleSubmit(submit)();
    expect(submit).toHaveBeenCalledOnce();
    submit.mockClear();

    form.resetField('file');
    form.setValue('confirmed', false);
    expect(await form.trigger('file')).toBe(false);
    form.setValue('confirmed', true);

    const invalid = vi.fn();
    await form.handleSubmit(submit, invalid)();
    expect(submit).not.toHaveBeenCalled();
    expect(invalid).toHaveBeenCalledWith(
      expect.objectContaining({
        file: expect.objectContaining({ message: 'Выберите файл решения.' }),
      }),
      undefined,
    );
  });
  it('accepts the exact size limit and rejects empty or oversized files', () => {
    expect(
      validateSolutionFile({ name: 'solution.ZIP', size: MAX_SOLUTION_SIZE }),
    ).toBeNull();
    expect(
      validateSolutionFile({ name: 'solution.pdf', size: 0 }),
    ).toBeTruthy();
    expect(
      validateSolutionFile({
        name: 'solution.pdf',
        size: MAX_SOLUTION_SIZE + 1,
      }),
    ).toBeTruthy();
    expect(
      validateSolutionFile({ name: 'solution.exe', size: 100 }),
    ).toBeTruthy();
  });
  it('closes at the deadline, including an open status from an older response', () => {
    const now = Date.parse('2026-10-10T12:00:00Z');
    expect(
      isTaskOpen({ status: 'open', deadlineAt: '2026-10-10T12:00:00Z' }, now),
    ).toBe(false);
    expect(isTaskOpen({ status: 'open', deadlineAt: null }, now)).toBe(true);
    expect(isTaskOpen({ status: 'closed', deadlineAt: null }, now)).toBe(false);
  });
  it('requires a file and explicit final confirmation', () => {
    expect(solutionSchema.safeParse({ confirmed: false }).success).toBe(false);
    const file = new File(['solution'], 'solution.txt');
    expect(solutionSchema.safeParse({ file, confirmed: false }).success).toBe(
      false,
    );
    expect(solutionSchema.safeParse({ file, confirmed: true }).success).toBe(
      true,
    );
  });
});
