import { describe, expect, it } from 'vitest';

import type { OperationDecision } from '../../model';
import {
  isDecisionReasonRequired,
  operationDecisionRequest,
} from '../operationDecisionRequest';

const base = {
  id: 'test-id',
  title: 'Решение',
  description: 'Описание',
  subjectLabel: 'Имя пользователя',
  subjectEmail: 'account@example.test',
};

describe('operation decision contracts', () => {
  it.each(['companies', 'users'] as const)(
    'sends a reason and no verification version for %s access changes',
    (kind) => {
      for (const status of ['active', 'blocked'] as const) {
        const decision: OperationDecision = { ...base, kind, status };
        expect(isDecisionReasonRequired(decision)).toBe(true);
        expect(operationDecisionRequest(decision, 'Причина')).toEqual({
          path: `/${kind}/test-id/status`,
          body: { status, reason: 'Причина' },
        });
      }
    },
  );
  it('retains optimistic verification version and optional approval comment', () => {
    const decision: OperationDecision = {
      ...base,
      kind: 'companies',
      status: 'verified',
      expectedVersion: 7,
    };
    expect(isDecisionReasonRequired(decision)).toBe(false);
    expect(operationDecisionRequest(decision, '')).toEqual({
      path: '/companies/test-id/verification',
      body: { status: 'verified', expected_version: 7 },
    });
    expect(isDecisionReasonRequired({ ...decision, status: 'rejected' })).toBe(
      true,
    );
  });
  it.each(['needs', 'tasks'] as const)(
    'preserves the %s moderation endpoint',
    (kind) => {
      const decision: OperationDecision = { ...base, kind, status: 'hidden' };
      expect(isDecisionReasonRequired(decision)).toBe(true);
      expect(operationDecisionRequest(decision, 'Нарушение')).toEqual({
        path: `/${kind}/test-id/moderation`,
        body: { status: 'hidden', reason: 'Нарушение' },
      });
    },
  );
});
