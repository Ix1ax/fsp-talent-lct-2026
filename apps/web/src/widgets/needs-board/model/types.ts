import { EmployerNeed, NeedStatus } from '@/entities/employer-need';

export type NeedList = {
  status: NeedStatus;
  pending: boolean;
  loading: boolean;
  listError: string;
  items: EmployerNeed[];
  selectedId: string;
  offset: number;
  hasMore: boolean;
  reload: () => void;
};
