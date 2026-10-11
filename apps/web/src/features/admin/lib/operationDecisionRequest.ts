import type { OperationDecision } from '../model';

export const isDecisionReasonRequired = (decision: OperationDecision) =>
  !('expectedVersion' in decision && decision.status === 'verified');

export const operationDecisionRequest = (
  decision: OperationDecision,
  reason: string,
) => {
  let suffix = 'status';
  if ('expectedVersion' in decision) suffix = 'verification';
  if (decision.kind === 'needs' || decision.kind === 'tasks')
    suffix = 'moderation';
  return {
    path: `/${decision.kind}/${decision.id}/${suffix}`,
    body: {
      status: decision.status,
      ...(reason ? { reason } : {}),
      ...('expectedVersion' in decision
        ? { expected_version: decision.expectedVersion }
        : {}),
    },
  };
};
