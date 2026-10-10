export type TaskFile = {
  id: string;
  purpose: 'company_task' | 'task_solution';
  originalName: string;
  mediaType: string;
  sizeBytes: number;
  checksumSha256: string;
  status: 'ready';
  createdAt: string;
};

export type TaskSubmission = {
  id: string;
  taskId: string;
  taskTitle: string;
  companyId: string;
  companyName: string;
  candidateId: string;
  file: TaskFile;
  status: 'submitted' | 'reviewed';
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  reviewedAt: string | null;
};

export type CompanyTask = {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  specializationId: number | null;
  gradeId: number | null;
  deadlineAt: string | null;
  file: TaskFile;
  status: 'open' | 'closed';
  publishedAt: string;
  publishedOn: string;
  moderationStatus: 'published' | 'hidden';
  mySubmission: { id: string; status: TaskSubmission['status'] } | null;
};

export type TaskPage<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
