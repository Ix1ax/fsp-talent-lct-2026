export type OperationDecision = {
  id: string;
  title: string;
  description: string;
  subjectLabel?: string;
  subjectEmail?: string | null;
} & (
  | {
      kind: 'companies';
      status: 'verified' | 'rejected' | 'unverified';
      expectedVersion: number;
    }
  | { kind: 'companies' | 'users'; status: 'active' | 'blocked' }
  | { kind: 'needs' | 'tasks'; status: 'published' | 'hidden' }
);
